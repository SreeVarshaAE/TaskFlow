from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    health_check,
    TaskListCreateView,
    TaskDetailView,
)
from .auth_views import RegisterView, TokenObtainPairView

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("register/", RegisterView.as_view(), name="register"),
    path("token/", TokenObtainPairView.as_view(), name="token-obtain-pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("tasks/", TaskListCreateView.as_view(), name="task-list-create"),
    path("tasks/<int:pk>/", TaskDetailView.as_view(), name="task-detail"),
]