from .user import User
from .candidate import Candidate
from sqlalchemy.orm import relationship

User.candidate = relationship(Candidate, uselist=False, back_populates="user")
Candidate.user = relationship(User, uselist=False, back_populates="candidate")
