from django.contrib import admin
from django.urls import path, include
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

# Quick health check route
@api_view(['GET'])
@permission_classes([AllowAny])
def api_health_check(request):
    return Response({"status": "online"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', api_health_check, name='api_health_check'),

    # Auth routes (login, register, token refresh)
    path('api/auth/', include('employees.auth_urls')),

    # Main modules
    path('api/departments/', include('departments.urls')),
    path('api/employees/', include('employees.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/attendance/', include('attendance.urls')),
    path('api/leaves/', include('leaves.urls')),
    path('api/dashboard/', include('dashboard.urls')),
]
