"""Magic-link authentication endpoints."""

import uuid
from datetime import UTC, datetime, timedelta

import resend
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import create_access_token, generate_otp, get_current_user
from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import RequestLinkIn, UserOut, VerifyOut

router = APIRouter()


def _send_magic_link(email: str, token: str) -> None:
    settings = get_settings()
    if not settings.resend_api_key:
        # Dev convenience: print the link instead of sending an email
        link = f"{settings.app_base_url}/auth/verify?token={token}"
        print(f"\n[DEV] Magic link for {email}:\n  {link}\n")
        return

    resend.api_key = settings.resend_api_key
    link = f"{settings.app_base_url}/auth/verify?token={token}"
    resend.Emails.send(
        {
            "from": "Newli <hello@newli.app>",
            "to": email,
            "subject": "Your Newli sign-in link",
            "html": (
                f"<p>Hi there,</p>"
                f"<p>Click the link below to sign in to Newli. "
                f"It expires in {get_settings().token_expire_minutes} minutes.</p>"
                f'<p><a href="{link}" style="font-size:16px;font-weight:bold;">Sign in to Newli</a></p>'
                f"<p>If you didn't request this, you can safely ignore it.</p>"
            ),
        }
    )


@router.post("/request-link", status_code=status.HTTP_200_OK)
def request_magic_link(
    body: RequestLinkIn,
    db: Session = Depends(get_db),
) -> dict:
    settings = get_settings()

    user = db.execute(select(User).where(User.email == body.email)).scalar_one_or_none()

    if user is None:
        display_name = body.display_name or body.email.split("@")[0]
        user = User(
            id=uuid.uuid4(),
            email=body.email,
            display_name=display_name,
            role=body.role,
        )
        db.add(user)

    otp = generate_otp()
    user.otp_token = otp
    user.otp_expires_at = datetime.now(UTC) + timedelta(minutes=settings.token_expire_minutes)
    db.commit()

    _send_magic_link(body.email, otp)

    return {"detail": "Magic link sent — check your email."}


@router.get("/verify", response_model=VerifyOut)
def verify_magic_link(
    token: str,
    db: Session = Depends(get_db),
) -> VerifyOut:
    user = db.execute(select(User).where(User.otp_token == token)).scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired link.")

    now = datetime.now(UTC)
    expires = user.otp_expires_at
    if expires is None or (expires.tzinfo is None and expires.replace(tzinfo=UTC) < now) or (
        expires.tzinfo is not None and expires < now
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Link has expired. Request a new one.")

    # Consume the token
    user.otp_token = None
    user.otp_expires_at = None
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.id, user.email, user.role)
    return VerifyOut(user=UserOut.model_validate(user), access_token=access_token)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)
