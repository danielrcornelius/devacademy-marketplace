"""Bookings and coach availability router.

Routes are split into two groups:
  /coaches/{coach_id}/slots      — public slot listing
  /coaches/{coach_id}/bookings   — athlete creates a booking
  /coaches/me/availability       — coach manages their windows
  /coaches/me/bookings           — coach views inbound bookings
  /users/me/bookings             — athlete views their own bookings
"""

import uuid
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import resend
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, get_optional_user
from app.config import get_settings
from app.database import get_db
from app.models.availability import CoachAvailability
from app.models.booking import Booking
from app.models.coach_profile import CoachProfile
from app.models.user import User
from app.schemas.bookings import (
    AvailabilityWindowOut,
    BookingCreate,
    BookingOut,
    SetAvailabilityIn,
    SlotOut,
)

coaches_router = APIRouter()   # mounted at /coaches
users_router = APIRouter()     # mounted at /users

SLOT_LOOKAHEAD_DAYS = 28  # how far ahead we generate slots for athletes


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_coach_or_404(coach_id: uuid.UUID, db: Session) -> CoachProfile:
    profile = db.execute(
        select(CoachProfile)
        .options(joinedload(CoachProfile.user))
        .where(CoachProfile.id == coach_id)
    ).unique().scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="Coach not found")
    return profile


def _get_my_profile_or_404(current_user: User, db: Session) -> CoachProfile:
    profile = db.execute(
        select(CoachProfile).where(CoachProfile.user_id == current_user.id)
    ).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="No coach profile found for this account")
    return profile


def _generate_slots(
    windows: list[CoachAvailability],
    booked_at: set[datetime],
    tz: ZoneInfo,
    start_date: date,
    end_date: date,
) -> list[SlotOut]:
    """Generate all open slots between start_date and end_date (inclusive).

    windows   — coach's recurring weekly windows
    booked_at — set of UTC datetimes already taken
    tz        — coach's timezone (for converting wall-clock times to UTC)
    """
    slots: list[SlotOut] = []
    current = start_date

    while current <= end_date:
        dow = current.weekday()  # 0=Monday
        for window in windows:
            if not window.is_active or window.day_of_week != dow:
                continue
            duration = window.slot_duration_minutes
            slot_start = datetime(
                current.year, current.month, current.day,
                window.start_time.hour, window.start_time.minute,
                tzinfo=tz,
            )
            window_end = datetime(
                current.year, current.month, current.day,
                window.end_time.hour, window.end_time.minute,
                tzinfo=tz,
            )
            while slot_start + timedelta(minutes=duration) <= window_end:
                slot_start_utc = slot_start.astimezone(UTC)
                # Skip slots in the past (with a small buffer)
                if slot_start_utc > datetime.now(UTC) + timedelta(minutes=5):
                    if slot_start_utc not in booked_at:
                        slots.append(SlotOut(
                            start=slot_start_utc,
                            end=slot_start_utc + timedelta(minutes=duration),
                            duration_minutes=duration,
                        ))
                slot_start += timedelta(minutes=duration)
        current += timedelta(days=1)

    return slots


def _send_booking_emails(
    coach_email: str,
    coach_name: str,
    athlete_name: str,
    athlete_email: str,
    scheduled_at: datetime,
    duration_minutes: int,
    notes: str | None,
) -> None:
    settings = get_settings()
    time_str = scheduled_at.strftime("%A, %B %-d %Y at %H:%M UTC")

    if not settings.resend_api_key:
        print(
            f"\n[DEV] Booking confirmed!\n"
            f"  Coach:    {coach_name} <{coach_email}>\n"
            f"  Athlete:  {athlete_name} <{athlete_email}>\n"
            f"  Time:     {time_str} ({duration_minutes} min)\n"
            f"  Notes:    {notes or '—'}\n"
        )
        return

    resend.api_key = settings.resend_api_key
    shared_details = (
        f"<p><strong>When:</strong> {time_str}</p>"
        f"<p><strong>Duration:</strong> {duration_minutes} minutes</p>"
        + (f"<p><strong>Notes:</strong> {notes}</p>" if notes else "")
    )

    resend.Emails.send({
        "from": "Newli <hello@newli.app>",
        "to": coach_email,
        "subject": f"New booking from {athlete_name} — Newli",
        "html": (
            f"<p>Hi {coach_name},</p>"
            f"<p><strong>{athlete_name}</strong> ({athlete_email}) has booked a session with you.</p>"
            + shared_details
            + "<p>Log in to Newli to manage your bookings.</p>"
        ),
    })
    resend.Emails.send({
        "from": "Newli <hello@newli.app>",
        "to": athlete_email,
        "subject": f"Your session with {coach_name} is confirmed — Newli",
        "html": (
            f"<p>Hi {athlete_name},</p>"
            f"<p>Your session with <strong>{coach_name}</strong> is confirmed!</p>"
            + shared_details
            + f"<p>Questions? Reply to this email or reach {coach_name} directly.</p>"
        ),
    })


# ── /coaches/me/availability ──────────────────────────────────────────────────

@coaches_router.get("/me/availability", response_model=list[AvailabilityWindowOut])
def get_my_availability(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AvailabilityWindowOut]:
    profile = _get_my_profile_or_404(current_user, db)
    windows = db.execute(
        select(CoachAvailability)
        .where(CoachAvailability.coach_profile_id == profile.id)
        .order_by(CoachAvailability.day_of_week, CoachAvailability.start_time)
    ).scalars().all()
    return [AvailabilityWindowOut.model_validate(w) for w in windows]


@coaches_router.put("/me/availability", response_model=list[AvailabilityWindowOut])
def set_my_availability(
    body: SetAvailabilityIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AvailabilityWindowOut]:
    """Full replacement of the coach's availability windows."""
    profile = _get_my_profile_or_404(current_user, db)

    # Validate time ranges
    for w in body.windows:
        if w.end_time <= w.start_time:
            raise HTTPException(
                status_code=422,
                detail=f"end_time must be after start_time for day {w.day_of_week}",
            )

    # Delete existing and replace
    db.execute(
        CoachAvailability.__table__.delete().where(
            CoachAvailability.coach_profile_id == profile.id
        )
    )
    new_windows = [
        CoachAvailability(
            coach_profile_id=profile.id,
            day_of_week=w.day_of_week,
            start_time=w.start_time,
            end_time=w.end_time,
            slot_duration_minutes=w.slot_duration_minutes,
            is_active=True,
        )
        for w in body.windows
    ]
    db.add_all(new_windows)
    db.commit()

    return [AvailabilityWindowOut.model_validate(w) for w in new_windows]


# ── /coaches/me/bookings ──────────────────────────────────────────────────────

@coaches_router.get("/me/bookings", response_model=list[BookingOut])
def get_my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    upcoming_only: bool = Query(default=True),
) -> list[BookingOut]:
    profile = _get_my_profile_or_404(current_user, db)
    stmt = (
        select(Booking)
        .where(
            and_(
                Booking.coach_profile_id == profile.id,
                Booking.status != "cancelled",
            )
        )
        .order_by(Booking.scheduled_at)
    )
    if upcoming_only:
        stmt = stmt.where(Booking.scheduled_at >= datetime.now(UTC))

    bookings = db.execute(stmt).scalars().all()
    return [BookingOut.model_validate(b) for b in bookings]


# ── /coaches/{coach_id}/slots ─────────────────────────────────────────────────

@coaches_router.get("/{coach_id}/slots", response_model=list[SlotOut])
def get_coach_slots(
    coach_id: uuid.UUID,
    db: Session = Depends(get_db),
    start: date = Query(default=None),
    end: date = Query(default=None),
) -> list[SlotOut]:
    """Return all open (unbooked) time slots for the given coach.

    Defaults to the next SLOT_LOOKAHEAD_DAYS days when start/end are omitted.
    """
    today = datetime.now(UTC).date()
    if start is None:
        start = today
    if end is None:
        end = today + timedelta(days=SLOT_LOOKAHEAD_DAYS)

    if end < start:
        raise HTTPException(status_code=422, detail="end must be >= start")
    if (end - start).days > 90:
        raise HTTPException(status_code=422, detail="date range cannot exceed 90 days")

    profile = _get_coach_or_404(coach_id, db)

    windows = db.execute(
        select(CoachAvailability)
        .where(
            and_(
                CoachAvailability.coach_profile_id == profile.id,
                CoachAvailability.is_active == True,  # noqa: E712
            )
        )
    ).scalars().all()

    if not windows:
        return []

    # Determine timezone
    tz_str = profile.timezone or "UTC"
    try:
        tz = ZoneInfo(tz_str)
    except ZoneInfoNotFoundError:
        tz = ZoneInfo("UTC")

    # Fetch all non-cancelled bookings in the window to exclude them
    range_start = datetime(start.year, start.month, start.day, tzinfo=UTC)
    range_end = datetime(end.year, end.month, end.day, 23, 59, 59, tzinfo=UTC)
    existing = db.execute(
        select(Booking.scheduled_at).where(
            and_(
                Booking.coach_profile_id == profile.id,
                Booking.status != "cancelled",
                Booking.scheduled_at >= range_start,
                Booking.scheduled_at <= range_end,
            )
        )
    ).scalars().all()
    booked_at: set[datetime] = {b.astimezone(UTC) for b in existing}

    return _generate_slots(list(windows), booked_at, tz, start, end)


# ── /coaches/{coach_id}/bookings ──────────────────────────────────────────────

@coaches_router.post(
    "/{coach_id}/bookings",
    response_model=BookingOut,
    status_code=status.HTTP_201_CREATED,
)
def create_booking(
    coach_id: uuid.UUID,
    body: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> BookingOut:
    """Book a specific slot with a coach.

    The unique constraint on (coach_profile_id, scheduled_at) means the DB
    will reject a race-condition double-book with an IntegrityError, which
    we translate to a clear SLOT_TAKEN error for the frontend to handle.
    """
    profile = _get_coach_or_404(coach_id, db)

    # Ensure the requested time is in the future
    scheduled_utc = body.scheduled_at.astimezone(UTC)
    if scheduled_utc <= datetime.now(UTC):
        raise HTTPException(status_code=422, detail="Cannot book a slot in the past")

    # Verify the slot is still open (pre-check before DB insert)
    conflict = db.execute(
        select(Booking).where(
            and_(
                Booking.coach_profile_id == profile.id,
                Booking.scheduled_at == scheduled_utc,
                Booking.status != "cancelled",
            )
        )
    ).scalar_one_or_none()
    if conflict is not None:
        raise HTTPException(status_code=409, detail="SLOT_TAKEN")

    # Resolve athlete identity
    athlete_name = body.athlete_name
    athlete_email = str(body.athlete_email)
    athlete_user_id = None
    if current_user is not None:
        athlete_name = current_user.display_name
        athlete_email = current_user.email
        athlete_user_id = current_user.id

    # Determine slot duration from coach's availability window that covers this time
    tz_str = profile.timezone or "UTC"
    try:
        tz = ZoneInfo(tz_str)
    except ZoneInfoNotFoundError:
        tz = ZoneInfo("UTC")

    local_dt = scheduled_utc.astimezone(tz)
    local_dow = local_dt.weekday()
    local_time = local_dt.time()

    duration = 60  # fallback
    windows = db.execute(
        select(CoachAvailability).where(
            and_(
                CoachAvailability.coach_profile_id == profile.id,
                CoachAvailability.day_of_week == local_dow,
                CoachAvailability.is_active == True,  # noqa: E712
            )
        )
    ).scalars().all()
    for w in windows:
        if w.start_time <= local_time < w.end_time:
            duration = w.slot_duration_minutes
            break

    booking = Booking(
        coach_profile_id=profile.id,
        athlete_user_id=athlete_user_id,
        athlete_name=athlete_name,
        athlete_email=athlete_email,
        scheduled_at=scheduled_utc,
        duration_minutes=duration,
        status="confirmed",
        notes=body.notes,
    )
    db.add(booking)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="SLOT_TAKEN")

    db.refresh(booking)

    _send_booking_emails(
        coach_email=profile.user.email,
        coach_name=profile.user.display_name,
        athlete_name=athlete_name,
        athlete_email=athlete_email,
        scheduled_at=scheduled_utc,
        duration_minutes=duration,
        notes=body.notes,
    )

    return BookingOut.model_validate(booking)


# ── /users/me/bookings ────────────────────────────────────────────────────────

@users_router.get("/me/bookings", response_model=list[BookingOut])
def get_my_athlete_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    upcoming_only: bool = Query(default=True),
) -> list[BookingOut]:
    stmt = (
        select(Booking)
        .where(
            and_(
                Booking.athlete_user_id == current_user.id,
                Booking.status != "cancelled",
            )
        )
        .order_by(Booking.scheduled_at)
    )
    if upcoming_only:
        stmt = stmt.where(Booking.scheduled_at >= datetime.now(UTC))
    bookings = db.execute(stmt).scalars().all()
    return [BookingOut.model_validate(b) for b in bookings]


@users_router.delete(
    "/me/bookings/{booking_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def cancel_my_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    booking = db.execute(
        select(Booking).where(
            and_(
                Booking.id == booking_id,
                Booking.athlete_user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.scheduled_at <= datetime.now(UTC):
        raise HTTPException(status_code=422, detail="Cannot cancel a past booking")
    booking.status = "cancelled"
    db.commit()
