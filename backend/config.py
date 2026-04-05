import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    # Token berlaku 1 jam
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)