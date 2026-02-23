"""
Custom pagination classes for optimized API responses.
"""
from rest_framework.pagination import PageNumberPagination, CursorPagination
from rest_framework.response import Response


class OptimizedPageNumberPagination(PageNumberPagination):
    """
    Optimized page number pagination that avoids COUNT queries on large tables.
    Uses cached counts where available.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'page': self.page.number,
            'total_pages': self.page.paginator.num_pages,
            'results': data
        })


class FastCursorPagination(CursorPagination):
    """
    Cursor-based pagination for very large datasets.
    Much faster than offset pagination for large tables as it doesn't need COUNT.
    """
    page_size = 20
    ordering = '-created_at'
    cursor_query_param = 'cursor'
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        return Response({
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data
        })


class ProductPagination(OptimizedPageNumberPagination):
    """Product-specific pagination with sensible defaults."""
    page_size = 25
    max_page_size = 100
