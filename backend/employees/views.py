"""
Views for Employee Management and Authentication.
Includes JWT login with user metadata, registration, logout, profile view,
and role-secured Employee CRUD.
"""

from rest_framework import viewsets, filters, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from .models import Employee, User
from .serializers import (
    EmployeeSerializer,
    EmployeeSimpleSerializer,
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .permissions import IsAdminOrHROrReadOnly


# Authentication views (Login, Register, Logout, Current User)

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Authenticates user credentials and returns JWT access & refresh tokens
    enriched with user profile details, role, employee ID, and department.
    """
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Registers a new employee user account and profile.
    Automatically logs the user in by returning access and refresh JWT tokens.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate tokens for seamless immediate login
        refresh = RefreshToken.for_user(user)
        emp = getattr(user, 'employee_profile', None)

        return Response(
            {
                "message": "User registered successfully.",
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "full_name": user.get_full_name() or user.username,
                    "role": user.role,
                    "employee_id": emp.employee_id if emp else None,
                    "designation": emp.designation if emp else None,
                    "department_id": emp.department_id if (emp and emp.department) else None,
                    "department_name": emp.department.name if (emp and emp.department) else None,
                }
            },
            status=status.HTTP_201_CREATED
        )


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Logs out by blacklisting the refresh token if provided.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except (TokenError, AttributeError):
                # Blacklisting may be optional if rotation blacklist is disabled
                pass
        return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    """
    GET /api/auth/me/
    Returns authenticated user's credentials, role, and linked employee details.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        emp = getattr(user, 'employee_profile', None)
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.get_full_name() or user.username,
            "role": user.role,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "employee_id": emp.employee_id if emp else None,
            "designation": emp.designation if emp else None,
            "salary": str(emp.salary) if emp else None,
            "phone": emp.phone if emp else None,
            "joining_date": emp.joining_date if emp else None,
            "employment_status": emp.employment_status if emp else None,
            "department_id": emp.department_id if (emp and emp.department) else None,
            "department_name": emp.department.name if (emp and emp.department) else None,
        })


# Employee CRUD viewset with search and filter
class EmployeeViewSet(viewsets.ModelViewSet):
    """
    Employee ViewSet.
    Enforces role-based permissions:
      - Authenticated users: Read-only access (GET list, retrieve)
      - Admin / HR users: Full CRUD (POST, PUT, PATCH, DELETE)
    Uses select_related for optimized SQL queries.
    Supports query parameter filters:
      - ?department=<id>
      - ?status=<ACTIVE|INACTIVE|TERMINATED>
      - ?search=<term>
    """
    queryset = Employee.objects.select_related('user', 'department').all().order_by('employee_id')
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdminOrHROrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'employee_id',
        'user__first_name',
        'user__last_name',
        'user__email',
        'designation',
        'phone',
    ]
    ordering_fields = ['employee_id', 'joining_date', 'salary', 'user__first_name']

    def get_queryset(self):
        """
        Dynamically filters by department and employment status if passed in query params.
        """
        queryset = super().get_queryset()
        department_id = self.request.query_params.get('department')
        if department_id:
            queryset = queryset.filter(department_id=department_id)

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(employment_status=status_param.upper())

        return queryset

    def perform_destroy(self, instance):
        """
        Clean up both Employee profile and associated non-superuser User account.
        """
        user = instance.user
        instance.delete()
        if user and not user.is_superuser:
            user.delete()

    @action(detail=False, methods=['get', 'put', 'patch'], url_path='me', permission_classes=[IsAuthenticated])
    def current_user_profile(self, request):
        """
        Endpoint: /api/employees/me/
        Retrieves or updates the employee profile for the authenticated request user.
        """
        if not hasattr(request.user, 'employee_profile'):
            return Response(
                {"error": "No employee profile found for the authenticated user."},
                status=status.HTTP_404_NOT_FOUND
            )

        employee = request.user.employee_profile

        if request.method == 'GET':
            serializer = self.get_serializer(employee)
            return Response(serializer.data)

        # PUT or PATCH update
        partial = (request.method == 'PATCH')
        serializer = self.get_serializer(employee, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
