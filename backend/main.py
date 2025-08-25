from chatbot_router import router as chatbot_router
from fastapi.middleware.cors import CORSMiddleware


from fastapi import FastAPI
from chatbot_router import router as chatbot_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your frontend URL for more security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chatbot_router, prefix="/api")