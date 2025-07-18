import pytest
import sys

if __name__ == "__main__":
    # Exécuter les tests avec couverture
    sys.exit(pytest.main(["-v", "--cov=app", "tests/"])) 