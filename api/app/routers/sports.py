from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sport import Sport
from app.schemas.sports import SportOut

router = APIRouter()


@router.get("", response_model=list[SportOut])
def list_sports(db: Session = Depends(get_db)) -> list[Sport]:
    result = db.execute(select(Sport).order_by(Sport.name))
    return list(result.scalars().all())
