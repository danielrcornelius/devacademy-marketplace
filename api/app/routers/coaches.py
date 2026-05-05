import uuid
from datetime import UTC, datetime

import resend
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, get_optional_user
from app.config import get_settings
from app.database import get_db
from app.models.coach_profile import CoachProfile, coach_profile_sports
from app.models.inquiry import Inquiry
from app.models.sport import Sport
from app.models.user import User
from app.schemas.coaches import CoachCreate, CoachProfileOut, CoachUpdate
from app.schemas.inquiries import InquiryCreate, InquiryOut
from app.schemas.sports import SportOut

router = APIRouter()


# ── helpers ───────────────────────────────────────────────────────────────────

def _build_out(profile: CoachProfile) -> CoachProfileOut:
    return CoachProfileOut(
        id=profile.id,
        headline=profile.headline,
        bio=profile.bio,
        adventure_story=profile.adventure_story,
        location_city=profile.location_city,
        location_region=profile.location_region,
        years_experience=profile.years_experience,
        website_url=profile.website_url,
        coaching_format=profile.coaching_format,
        timezone=profile.timezone,
        created_at=profile.created_at,
        display_name=profile.user.display_name,
        email=profile.user.email,
        sports=[SportOut.model_validate(s) for s in profile.sports],
    )


def _resolve_sports(slugs: list[str], db: Session) -> list[Sport]:
    sports = db.execute(select(Sport).where(Sport.slug.in_(slugs))).scalars().all()
    found = {s.slug for s in sports}
    missing = [s for s in slugs if s not in found]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown sport slug(s): {', '.join(missing)}",
        )
    return list(sports)


def _reload(profile_id: uuid.UUID, db: Session) -> CoachProfileOut:
    loaded = db.execute(
        select(CoachProfile)
        .options(joinedload(CoachProfile.user), joinedload(CoachProfile.sports))
        .where(CoachProfile.id == profile_id)
    ).unique().scalar_one()
    return _build_out(loaded)


# ── /me routes (before /{coach_id} to avoid routing ambiguity) ────────────────

@router.get("/me", response_model=CoachProfileOut)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CoachProfileOut:
    profile = db.execute(
        select(CoachProfile)
        .options(joinedload(CoachProfile.user), joinedload(CoachProfile.sports))
        .where(CoachProfile.user_id == current_user.id)
    ).unique().scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="No coach profile found for this account")
    return _build_out(profile)


@router.patch("/me", response_model=CoachProfileOut)
def update_my_profile(
    body: CoachUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CoachProfileOut:
    profile = db.execute(
        select(CoachProfile)
        .options(joinedload(CoachProfile.user), joinedload(CoachProfile.sports))
        .where(CoachProfile.user_id == current_user.id)
    ).unique().scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="No coach profile found for this account")

    if body.headline is not None:
        profile.headline = body.headline
    if body.bio is not None:
        profile.bio = body.bio
    if body.adventure_story is not None:
        profile.adventure_story = body.adventure_story
    if body.location_city is not None:
        profile.location_city = body.location_city
    if body.location_region is not None:
        profile.location_region = body.location_region
    if body.years_experience is not None:
        profile.years_experience = body.years_experience
    if body.website_url is not None:
        profile.website_url = body.website_url
    if body.coaching_format is not None:
        profile.coaching_format = body.coaching_format
    if body.timezone is not None:
        profile.timezone = body.timezone
    if body.sport_slugs is not None:
        profile.sports = _resolve_sports(body.sport_slugs, db)

    db.commit()
    return _reload(profile.id, db)


# ── list / get ────────────────────────────────────────────────────────────────

@router.get("", response_model=list[CoachProfileOut])
def list_coaches(
    db: Session = Depends(get_db),
    sport_slug: str | None = Query(default=None),
    q: str | None = Query(default=None),
) -> list[CoachProfileOut]:
    stmt = (
        select(CoachProfile)
        .options(joinedload(CoachProfile.user), joinedload(CoachProfile.sports))
        .order_by(CoachProfile.created_at.desc())
    )
    if sport_slug:
        sport = db.execute(select(Sport).where(Sport.slug == sport_slug)).scalar_one_or_none()
        if sport is None:
            return []
        stmt = stmt.where(
            CoachProfile.id.in_(
                select(coach_profile_sports.c.coach_profile_id).where(
                    coach_profile_sports.c.sport_id == sport.id
                )
            )
        )
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                CoachProfile.headline.ilike(pattern),
                CoachProfile.bio.ilike(pattern),
                CoachProfile.adventure_story.ilike(pattern),
            )
        )
    profiles = db.execute(stmt).unique().scalars().all()
    return [_build_out(p) for p in profiles]


@router.get("/{coach_id}", response_model=CoachProfileOut)
def get_coach(coach_id: uuid.UUID, db: Session = Depends(get_db)) -> CoachProfileOut:
    profile = db.execute(
        select(CoachProfile)
        .options(joinedload(CoachProfile.user), joinedload(CoachProfile.sports))
        .where(CoachProfile.id == coach_id)
    ).unique().scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="Coach not found")
    return _build_out(profile)


# ── create ────────────────────────────────────────────────────────────────────

@router.post("", response_model=CoachProfileOut, status_code=status.HTTP_201_CREATED)
def create_coach(
    body: CoachCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> CoachProfileOut:
    sports = _resolve_sports(body.sport_slugs, db)

    if current_user is not None:
        # Authenticated — use the existing user account
        if current_user.coach_profile is not None:
            raise HTTPException(status_code=409, detail="PROFILE_EXISTS")
        user = current_user
        if user.role != "coach":
            user.role = "coach"
    else:
        # Anonymous — email + display_name required
        if not body.email or not body.display_name:
            raise HTTPException(
                status_code=422,
                detail="email and display_name are required when not signed in",
            )
        existing = db.execute(
            select(User).where(User.email == str(body.email))
        ).scalar_one_or_none()
        if existing is not None:
            raise HTTPException(status_code=409, detail="A user with this email already exists")
        user = User(email=str(body.email), display_name=body.display_name, role="coach")
        db.add(user)

    profile = CoachProfile(
        headline=body.headline,
        bio=body.bio,
        adventure_story=body.adventure_story,
        location_city=body.location_city,
        location_region=body.location_region,
        years_experience=body.years_experience,
        website_url=body.website_url,
        coaching_format=body.coaching_format,
        timezone=body.timezone,
        sports=sports,
    )
    user.coach_profile = profile
    db.commit()
    db.refresh(profile)

    return _reload(profile.id, db)


# ── inquiries ─────────────────────────────────────────────────────────────────

def _send_inquiry_email(
    coach_email: str,
    coach_name: str,
    sender_name: str,
    sender_email: str,
    message: str,
) -> None:
    settings = get_settings()
    if not settings.resend_api_key:
        print(
            f"\n[DEV] Inquiry notification for {coach_name} <{coach_email}>:\n"
            f"  From: {sender_name} <{sender_email}>\n"
            f"  Message: {message}\n"
        )
        return

    resend.api_key = settings.resend_api_key
    resend.Emails.send(
        {
            "from": "Newli <hello@newli.app>",
            "to": coach_email,
            "subject": f"New inquiry from {sender_name} — Newli",
            "html": (
                f"<p>Hi {coach_name},</p>"
                f"<p>You have a new inquiry on Newli from <strong>{sender_name}</strong> "
                f"({sender_email}):</p>"
                f'<blockquote style="border-left:3px solid #d85a30;margin:16px 0;padding:0 16px;color:#534ab7">'
                f"{message}"
                f"</blockquote>"
                f"<p>Reply directly to this email or reach them at "
                f'<a href="mailto:{sender_email}">{sender_email}</a>.</p>'
            ),
        }
    )


@router.post("/{coach_id}/inquiries", response_model=InquiryOut, status_code=status.HTTP_201_CREATED)
def create_inquiry(
    coach_id: uuid.UUID,
    body: InquiryCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> InquiryOut:
    profile = db.execute(
        select(CoachProfile)
        .options(joinedload(CoachProfile.user))
        .where(CoachProfile.id == coach_id)
    ).unique().scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="Coach not found")

    sender_name = body.sender_name
    sender_email = str(body.sender_email)
    sender_user_id = None

    if current_user is not None:
        sender_name = current_user.display_name
        sender_email = current_user.email
        sender_user_id = current_user.id

    inquiry = Inquiry(
        id=uuid.uuid4(),
        coach_profile_id=profile.id,
        sender_user_id=sender_user_id,
        sender_name=sender_name,
        sender_email=sender_email,
        message=body.message,
        created_at=datetime.now(UTC),
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)

    _send_inquiry_email(
        coach_email=profile.user.email,
        coach_name=profile.user.display_name,
        sender_name=sender_name,
        sender_email=sender_email,
        message=body.message,
    )

    return InquiryOut.model_validate(inquiry)


@router.get("/me/inquiries", response_model=list[InquiryOut])
def list_my_inquiries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[InquiryOut]:
    profile = db.execute(
        select(CoachProfile).where(CoachProfile.user_id == current_user.id)
    ).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="No coach profile found for this account")

    inquiries = db.execute(
        select(Inquiry)
        .where(Inquiry.coach_profile_id == profile.id)
        .order_by(Inquiry.created_at.desc())
    ).scalars().all()
    return [InquiryOut.model_validate(i) for i in inquiries]
