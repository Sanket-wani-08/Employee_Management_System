"""
Serializers for User and Employee models.
Handles reading, creating, and updating employee profiles and underlying user accounts.
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import transaction
from django.utils import timezone
import random
from .models import User, Employee
from departments.models import Department


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model attributes.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']
        read_only_fields = ['id']


class EmployeeSimpleSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for embedding in dropdowns, project teams, and rosters.
    """
    full_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True, default='')

    class Meta:
        model = Employee
        fields = [
            'id',
            'employee_id',
            'full_name',
            'email',
            'designation',
            'department',
            'department_name',
            'employment_status',
        ]


class EmployeeSerializer(serializers.ModelSerializer):
    """
    Comprehensive Employee Serializer supporting nested User data reading and writing.
    Atomically manages both the User account and Employee profile.
    """
    user = UserSerializer(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True, default='')
    full_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    # Input fields for User account management
    username = serializers.CharField(write_only=True, required=False)
    user_email = serializers.EmailField(write_only=True, required=False)
    first_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, write_only=True, required=False, default=User.ROLE_EMPLOYEE)

    class Meta:
        model = Employee
        fields = [
            'id',
            'employee_id',
            'user',
            'full_name',
            'email',
            'phone',
            'department',
            'department_name',
            'designation',
            'salary',
            'joining_date',
            'employment_status',
            'created_at',
            'updated_at',
            # Write-only fields
            'username',
            'user_email',
            'first_name',
            'last_name',
            'password',
            'role',
        ]
        read_only_fields = ['id', 'user', 'full_name', 'email', 'department_name', 'created_at', 'updated_at']

    def validate_employee_id(self, value):
        """Ensure employee_id is unique on creation or self-updating."""
        qs = Employee.objects.filter(employee_id__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("An employee with this Employee ID already exists.")
        return value.upper()

    def validate(self, attrs):
        """Validate unique username and email when creating a new employee."""
        if not self.instance:
            username = attrs.get('username')
            user_email = attrs.get('user_email')
            password = attrs.get('password')

            if not username:
                raise serializers.ValidationError({'username': 'Username is required when creating an employee.'})
            if not user_email:
                raise serializers.ValidationError({'user_email': 'Email is required when creating an employee.'})
            if not password:
                raise serializers.ValidationError({'password': 'Password is required when creating an employee.'})

            if User.objects.filter(username__iexact=username).exists():
                raise serializers.ValidationError({'username': 'This username is already taken.'})
            if User.objects.filter(email__iexact=user_email).exists():
                raise serializers.ValidationError({'user_email': 'This email is already registered.'})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        """Atomically create both User account and Employee profile."""
        username = validated_data.pop('username')
        user_email = validated_data.pop('user_email')
        password = validated_data.pop('password')
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        role = validated_data.pop('role', User.ROLE_EMPLOYEE)

        # Create user with hashed password
        user = User.objects.create_user(
            username=username,
            email=user_email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
            is_staff=(role in [User.ROLE_ADMIN, User.ROLE_HR, User.ROLE_PROJECT_MANAGER])
        )

        employee = Employee.objects.create(user=user, **validated_data)
        return employee

    @transaction.atomic
    def update(self, instance, validated_data):
        """Atomically update Employee profile and associated User record."""
        user = instance.user
        user_changed = False

        if 'first_name' in validated_data:
            user.first_name = validated_data.pop('first_name')
            user_changed = True
        if 'last_name' in validated_data:
            user.last_name = validated_data.pop('last_name')
            user_changed = True
        if 'user_email' in validated_data:
            new_email = validated_data.pop('user_email')
            if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                raise serializers.ValidationError({'user_email': 'This email is already in use by another user.'})
            user.email = new_email
            user_changed = True
        if 'role' in validated_data:
            user.role = validated_data.pop('role')
            user.is_staff = (user.role in [User.ROLE_ADMIN, User.ROLE_HR, User.ROLE_PROJECT_MANAGER])
            user_changed = True
        if 'password' in validated_data:
            password = validated_data.pop('password')
            if password:
                user.set_password(password)
                user_changed = True

        if user_changed:
            user.save()

        # Update remaining Employee profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT Token Serializer that enriches the login response
    with user profile, role, employee ID, and department info.
    """
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        emp = getattr(user, 'employee_profile', None)

        data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': user.get_full_name() or user.username,
            'role': user.role,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'employee_id': emp.employee_id if emp else None,
            'designation': emp.designation if emp else None,
            'department_id': emp.department_id if (emp and emp.department) else None,
            'department_name': emp.department.name if (emp and emp.department) else None,
        }
        return data


class RegisterSerializer(serializers.ModelSerializer):
    """
    Public registration serializer for new users.
    Creates both the User account (role EMPLOYEE) and linked Employee profile.
    """
    password = serializers.CharField(write_only=True, min_length=6, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, min_length=6, style={'input_type': 'password'})
    phone = serializers.CharField(required=False, allow_blank=True)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False, allow_null=True)
    designation = serializers.CharField(required=False, default='Associate')
    employee_id = serializers.CharField(required=False)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'password',
            'confirm_password',
            'phone',
            'department',
            'designation',
            'employee_id',
        ]

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({'confirm_password': "Passwords do not match."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        phone = validated_data.pop('phone', '')
        department = validated_data.pop('department', None)
        designation = validated_data.pop('designation', 'Associate')
        emp_id = validated_data.pop('employee_id', None)

        if not emp_id:
            while True:
                candidate_id = f"EMP{random.randint(1000, 9999)}"
                if not Employee.objects.filter(employee_id=candidate_id).exists():
                    emp_id = candidate_id
                    break

        user = User.objects.create_user(
            role=User.ROLE_EMPLOYEE,
            **validated_data
        )
        user.set_password(password)
        user.save()

        Employee.objects.create(
            user=user,
            employee_id=emp_id,
            department=department,
            designation=designation,
            phone=phone,
            joining_date=timezone.localdate(),
            employment_status=Employee.STATUS_ACTIVE
        )
        return user


