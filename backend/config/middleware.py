"""
Custom middleware for performance monitoring and optimization.
"""
import time
import logging
from django.conf import settings
from django.db import connection

logger = logging.getLogger(__name__)


class QueryCountDebugMiddleware:
    """
    Middleware to log the number of database queries per request.
    Only active when DEBUG=True and QUERY_DEBUG=True in settings.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if not settings.DEBUG or not getattr(settings, 'QUERY_DEBUG', False):
            return self.get_response(request)
        
        # Reset query log
        connection.queries_log.clear()
        
        start_time = time.time()
        response = self.get_response(request)
        end_time = time.time()
        
        # Count queries
        total_queries = len(connection.queries)
        total_time = sum(float(q.get('time', 0)) for q in connection.queries)
        
        # Log if query count is high
        if total_queries > 10:
            logger.warning(
                f"High query count: {request.path} - {total_queries} queries "
                f"in {total_time:.3f}s (request time: {end_time - start_time:.3f}s)"
            )
            # Log slow queries
            for query in connection.queries:
                if float(query.get('time', 0)) > 0.1:
                    logger.warning(f"Slow query ({query['time']}s): {query['sql'][:200]}")
        
        # Add header for debugging
        if settings.DEBUG:
            response['X-Query-Count'] = str(total_queries)
            response['X-Query-Time'] = f"{total_time:.3f}s"
        
        return response


class ResponseTimeMiddleware:
    """
    Middleware to add response time header.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        start_time = time.time()
        response = self.get_response(request)
        duration = time.time() - start_time
        
        response['X-Response-Time'] = f"{duration:.3f}s"
        
        return response
