import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.sport import Sport
from app.models.student_goal import StudentGoal
from app.models.user import User
from app.schemas.sports import SportOut
from app.schemas.student_goals import StudentGoalCreate, StudentGoalOut

router = APIRouter()


def _goal_to_out(goal: StudentGoal) -> StudentGoalOut:
    sport_out = SportOut.model_validate(goal.sport) if goal.sport else None
    return StudentGoalOut(
        id=goal.id,
        title=goal.title,
        goal_description=goal.goal_description,
        skill_level=goal.skill_level,
        target_date=goal.target_date,
        created_at=goal.created_at,
        display_name=goal.user.display_name,
        email=goal.user.email,
        sport=sport_out,
    )


@router.get("", response_model=list[StudentGoalOut])
def list_student_goals(
    db: Session = Depends(get_db),
    sport_slug: str | None = Query(default=None),
) -> list[StudentGoalOut]:
    stmt = (
        select(StudentGoal)
        .options(joinedload(StudentGoal.user), joinedload(StudentGoal.sport))
        .order_by(StudentGoal.created_at.desc())
    )
    if sport_slug:
        sport = db.execute(select(Sport).where(Sport.slug == sport_slug)).scalar_one_or_none()
        if sport is None:
            return []
        stmt = stmt.where(StudentGoal.sport_id == sport.id)
    goals = db.execute(stmt).unique().scalars().all()
    return [_goal_to_out(g) for g in goals]


@router.get("/{goal_id}", response_model=StudentGoalOut)
def get_student_goal(goal_id: uuid.UUID, db: Session = Depends(get_db)) -> StudentGoalOut:
    goal = db.execute(
        select(StudentGoal)
        .options(joinedload(StudentGoal.user), joinedload(StudentGoal.sport))
        .where(StudentGoal.id == goal_id)
    ).scalar_one_or_none()
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return _goal_to_out(goal)


@router.post("", response_model=StudentGoalOut, status_code=201)
def create_student_goal(body: StudentGoalCreate, db: Session = Depends(get_db)) -> StudentGoalOut:
    sport: Sport | None = None
    if body.sport_slug:
        sport = db.execute(select(Sport).where(Sport.slug == body.sport_slug)).scalar_one_or_none()
        if sport is None:
            raise HTTPException(status_code=400, detail=f"Unknown sport slug: {body.sport_slug}")

    existing = db.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
    if existing is not None:
        user = existing
        if user.role not in ("student", "both"):
            user.role = "both"
    else:
        user = User(email=str(body.email), display_name=body.display_name, role="student")
        db.add(user)
        db.flush()

    goal = StudentGoal(
        user_id=user.id,
        title=body.title,
        goal_description=body.goal_description,
        sport_id=sport.id if sport else None,
        skill_level=body.skill_level,
        target_date=body.target_date,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    loaded = db.execute(
        select(StudentGoal)
        .options(joinedload(StudentGoal.user), joinedload(StudentGoal.sport))
        .where(StudentGoal.id == goal.id)
    ).scalar_one()
    return _goal_to_out(loaded)
