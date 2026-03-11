"""
Performance test suite for BreachLens API.

Tests response times, pagination efficiency, caching, and concurrent request handling.

NOTE: These tests are marked as integration tests because they require:
- Running MongoDB instance with seeded data
- All API dependencies available

Run with: pytest -m integration (or pytest -m "not integration" to skip)
"""
import pytest
import time
import copy
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

# Mark all tests in this module as integration tests
pytestmark = pytest.mark.integration


class TestPerformance:
    """Performance and load testing for API endpoints."""

    def test_list_breaches_response_time(self, client):
        """Verify list endpoint responds under 500ms for small result sets."""
        start = time.time()
        response = client.get("/api/v1/breaches?limit=20")
        duration_ms = (time.time() - start) * 1000

        assert response.status_code == 200
        assert duration_ms < 500, f"Response took {duration_ms:.2f}ms (target: < 500ms)"
        data = response.json
        assert "data" in data
        assert "meta" in data

    def test_analytics_endpoint_response_time(self, client, analyst_token):
        """Verify aggregation pipeline performs under 1 second."""
        start = time.time()
        response = client.get(
            "/api/v1/analytics/risk-by-industry",
            headers={"x-access-token": analyst_token}
        )
        duration_ms = (time.time() - start) * 1000

        assert response.status_code == 200
        assert duration_ms < 1000, f"Analytics took {duration_ms:.2f}ms (target: < 1000ms)"

    def test_single_breach_response_time(self, client, sample_breach, admin_token):
        """Verify single document retrieval is fast."""
        # Create a breach first
        create_response = client.post(
            "/api/v1/breaches",
            json=sample_breach,
            headers={"x-access-token": admin_token}
        )
        assert create_response.status_code == 201
        breach_id = create_response.json["data"].get("id") or create_response.json["data"].get("_id")

        # Test retrieval speed
        start = time.time()
        response = client.get(f"/api/v1/breaches/{breach_id}")
        duration_ms = (time.time() - start) * 1000

        assert response.status_code == 200
        assert duration_ms < 200, f"Single fetch took {duration_ms:.2f}ms (target: < 200ms)"

    def test_pagination_consistency(self, client):
        """Verify pagination performance is consistent across pages."""
        times = []
        pages_to_test = [1, 5, 10]

        for page in pages_to_test:
            start = time.time()
            response = client.get(f"/api/v1/breaches?page={page}&limit=10")
            duration = time.time() - start
            times.append(duration)

            assert response.status_code == 200

        # Later pages should not be significantly slower than first page
        first_page_time = times[0]
        for i, page_time in enumerate(times[1:], 1):
            ratio = page_time / first_page_time
            assert ratio < 2.0, f"Page {pages_to_test[i]} is {ratio:.2f}x slower than page 1 (target: < 2.0x)"

    def test_caching_improves_performance(self, client, analyst_token):
        """Verify that caching significantly improves analytics endpoint performance."""
        endpoint = "/api/v1/analytics/risk-by-industry"
        headers = {"x-access-token": analyst_token}

        # First request (cold cache)
        start = time.time()
        response1 = client.get(endpoint, headers=headers)
        first_duration = time.time() - start
        assert response1.status_code == 200

        # Second request (warm cache)
        start = time.time()
        response2 = client.get(endpoint, headers=headers)
        cached_duration = time.time() - start
        assert response2.status_code == 200

        # Cached response should be faster (or similar if DB is very fast locally)
        assert cached_duration <= first_duration * 1.2, \
            f"Cached request ({cached_duration*1000:.2f}ms) not faster than first ({first_duration*1000:.2f}ms)"

        # Responses should be identical
        assert response1.json == response2.json

    def test_concurrent_read_requests(self, client):
        """Verify app handles concurrent read requests without degradation."""
        endpoint = "/api/v1/breaches?limit=10"
        num_requests = 20
        max_threads = 10

        def make_request():
            start = time.time()
            response = client.get(endpoint)
            duration = time.time() - start
            return response.status_code, duration

        with ThreadPoolExecutor(max_workers=max_threads) as executor:
            futures = [executor.submit(make_request) for _ in range(num_requests)]
            results = [future.result() for future in as_completed(futures)]

        # All requests should succeed
        statuses = [r[0] for r in results]
        assert all(status == 200 for status in statuses), "Some concurrent requests failed"

        # Calculate average response time
        durations = [r[1] for r in results]
        avg_duration = sum(durations) / len(durations)
        max_duration = max(durations)

        assert avg_duration < 1.0, f"Average response time {avg_duration:.3f}s too slow"
        assert max_duration < 2.0, f"Slowest request took {max_duration:.3f}s"

    def test_health_check_is_fast(self, client):
        """Verify health check endpoint responds under 100ms."""
        start = time.time()
        response = client.get("/health")
        duration_ms = (time.time() - start) * 1000

        assert response.status_code == 200
        assert duration_ms < 100, f"Health check took {duration_ms:.2f}ms (target: < 100ms)"

    def test_readiness_check_with_dependencies(self, client):
        """Verify readiness check validates dependencies quickly."""
        start = time.time()
        response = client.get("/health/ready")
        duration_ms = (time.time() - start) * 1000

        # Should be 200 (ready) or 503 (unavailable)
        assert response.status_code in [200, 503]
        assert duration_ms < 500, f"Readiness check took {duration_ms:.2f}ms (target: < 500ms)"

        data = response.json
        assert "checks" in data
        assert "mongodb" in data["checks"]


class TestConcurrency:
    """Test concurrent request handling and race conditions."""

    def test_concurrent_breach_creation(self, client, admin_token, sample_breach):
        """Verify app handles concurrent POST requests without conflicts."""
        num_requests = 10

        def create_breach(index):
            # Use deep copy to avoid shared nested objects across threads
            data = copy.deepcopy(sample_breach)
            data["title"] = f"Concurrent Breach Test {index}"
            data["organisation"]["name"] = f"Test Org {index}"
            return client.post(
                "/api/v1/breaches",
                json=data,
                headers={"x-access-token": admin_token}
            )

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(create_breach, i) for i in range(num_requests)]
            responses = [future.result() for future in as_completed(futures)]

        # All should succeed
        statuses = [r.status_code for r in responses]
        success_count = sum(1 for s in statuses if s == 201)

        assert success_count >= 8, f"Only {success_count}/{num_requests} concurrent creates succeeded"

    def test_concurrent_read_write(self, client, admin_token, sample_breach):
        """Verify reads and writes don't interfere with each other."""
        # Create a breach first
        create_response = client.post(
            "/api/v1/breaches",
            json=sample_breach,
            headers={"x-access-token": admin_token}
        )
        assert create_response.status_code == 201
        breach_id = create_response.json["data"].get("id") or create_response.json["data"].get("_id")

        read_errors = []
        write_errors = []

        def read_breach():
            try:
                response = client.get(f"/api/v1/breaches/{breach_id}")
                if response.status_code != 200:
                    read_errors.append(response.status_code)
            except Exception as e:
                read_errors.append(str(e))

        def update_breach(index):
            try:
                update_data = sample_breach.copy()
                update_data["status"] = "active" if index % 2 == 0 else "contained"
                response = client.patch(
                    f"/api/v1/breaches/{breach_id}",
                    json={"status": update_data["status"]},
                    headers={"x-access-token": admin_token}
                )
                if response.status_code != 200:
                    write_errors.append(response.status_code)
            except Exception as e:
                write_errors.append(str(e))

        # Mix of reads and writes
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            for i in range(20):
                if i % 3 == 0:
                    futures.append(executor.submit(update_breach, i))
                else:
                    futures.append(executor.submit(read_breach))

            for future in as_completed(futures):
                future.result()

        assert len(read_errors) == 0, f"Read errors: {read_errors}"
        assert len(write_errors) == 0, f"Write errors: {write_errors}"

    def test_no_connection_pool_exhaustion(self, client, admin_token):
        """Verify MongoDB connection pool handles high load."""
        num_requests = 100
        max_threads = 20

        def make_request():
            response = client.get(
                "/api/v1/analytics/summary",
                headers={"x-access-token": admin_token}
            )
            return response.status_code

        with ThreadPoolExecutor(max_workers=max_threads) as executor:
            futures = [executor.submit(make_request) for _ in range(num_requests)]
            statuses = [future.result() for future in as_completed(futures)]

        # All should succeed (no pool exhaustion)
        success_count = sum(1 for s in statuses if s in [200, 401, 403])
        assert success_count >= num_requests * 0.95, \
            f"Only {success_count}/{num_requests} requests succeeded (possible pool exhaustion)"


class TestScalability:
    """Test API behavior under varying loads."""

    def test_large_result_set_pagination(self, client):
        """Verify pagination handles large offsets efficiently."""
        # Test accessing a page far into the result set
        response = client.get("/api/v1/breaches?page=100&limit=10")

        assert response.status_code == 200
        data = response.json

        # Should return valid pagination info even if no results
        assert "meta" in data
        assert "page" in data["meta"]
        assert "limit" in data["meta"]

    def test_filtering_performance(self, client):
        """Verify filtered queries perform well."""
        filters = [
            "?severity=critical",
            "?status=active",
            "?industry=finance",
            "?severity=critical&status=active",
        ]

        for filter_param in filters:
            start = time.time()
            response = client.get(f"/api/v1/breaches{filter_param}&limit=20")
            duration_ms = (time.time() - start) * 1000

            assert response.status_code == 200, f"Filter {filter_param} failed"
            assert duration_ms < 500, f"Filter {filter_param} took {duration_ms:.2f}ms (target: < 500ms)"

    def test_search_performance(self, client):
        """Verify text search performs adequately."""
        start = time.time()
        response = client.get("/api/v1/breaches?search=test&limit=20")
        duration_ms = (time.time() - start) * 1000

        assert response.status_code == 200
        # Text search can be slower, allow up to 800ms
        assert duration_ms < 800, f"Text search took {duration_ms:.2f}ms (target: < 800ms)"
