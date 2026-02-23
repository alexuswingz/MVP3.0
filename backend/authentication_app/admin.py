from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'subscription_tier', 'is_active', 'date_joined']
    list_filter = ['is_active', 'is_staff', 'subscription_tier']
    search_fields = ['email', 'first_name', 'last_name', 'amazon_seller_id']
    ordering = ['-date_joined']
    list_per_page = 50
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name')}),
        ('Amazon Info', {'fields': ('amazon_seller_id', 'marketplace_id')}),
        ('Subscription', {'fields': ('subscription_tier', 'timezone')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2'),
        }),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['get_user_email', 'company_name', 'default_doi_goal', 'default_lead_time']
    search_fields = ['user__email', 'company_name']
    list_select_related = ['user']
    list_per_page = 50
    raw_id_fields = ['user']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
    
    @admin.display(description='User')
    def get_user_email(self, obj):
        return obj.user.email if obj.user else '-'
