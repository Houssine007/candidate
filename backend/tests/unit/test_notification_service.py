import pytest
from unittest.mock import Mock, patch
from app.services.notification import NotificationService
from app.models.notification import NotificationType

@pytest.mark.unit
class TestNotificationService:
    @pytest.fixture
    def mock_email_service(self):
        """Fixture pour le service d'email mocké."""
        return Mock()

    @pytest.fixture
    def notification_service(self, mock_email_service):
        """Fixture pour le service de notification avec dépendances mockées."""
        return NotificationService(email_service=mock_email_service)

    def test_create_match_notification(self, notification_service, mock_email_service):
        """Teste la création d'une notification de matching."""
        # Données de test
        candidate = {
            "id": 1,
            "email": "candidate@example.com",
            "full_name": "Test Candidate"
        }
        job = {
            "id": 1,
            "title": "Développeur Python",
            "company": "Test Company"
        }
        match_score = 85

        # Création de la notification
        notification = notification_service.create_match_notification(
            candidate=candidate,
            job=job,
            match_score=match_score
        )

        # Vérifications
        assert notification.type == NotificationType.MATCH
        assert notification.recipient_id == candidate["id"]
        assert notification.content == f"Match trouvé avec le poste {job['title']} chez {job['company']} (Score: {match_score}%)"
        assert notification.is_read is False

    def test_create_application_notification(self, notification_service, mock_email_service):
        """Teste la création d'une notification de candidature."""
        # Données de test
        candidate = {
            "id": 1,
            "email": "candidate@example.com",
            "full_name": "Test Candidate"
        }
        job = {
            "id": 1,
            "title": "Développeur Python",
            "company": "Test Company"
        }

        # Création de la notification
        notification = notification_service.create_application_notification(
            candidate=candidate,
            job=job
        )

        # Vérifications
        assert notification.type == NotificationType.APPLICATION
        assert notification.recipient_id == candidate["id"]
        assert notification.content == f"Votre candidature pour le poste {job['title']} chez {job['company']} a été reçue"
        assert notification.is_read is False

    def test_send_email_notification(self, notification_service, mock_email_service):
        """Teste l'envoi d'une notification par email."""
        # Données de test
        recipient_email = "test@example.com"
        subject = "Test Notification"
        content = "This is a test notification"

        # Envoi de la notification
        notification_service.send_email_notification(
            recipient_email=recipient_email,
            subject=subject,
            content=content
        )

        # Vérification que le service d'email a été appelé
        mock_email_service.send_email.assert_called_once_with(
            recipient_email=recipient_email,
            subject=subject,
            content=content
        )

    def test_mark_notification_as_read(self, notification_service):
        """Teste le marquage d'une notification comme lue."""
        # Création d'une notification de test
        notification = Mock()
        notification.is_read = False

        # Marquage comme lue
        notification_service.mark_notification_as_read(notification)

        # Vérification
        assert notification.is_read is True

    @patch('app.services.notification.NotificationService.send_email_notification')
    def test_notify_match(self, mock_send_email, notification_service):
        """Teste la notification complète d'un match."""
        # Données de test
        candidate = {
            "id": 1,
            "email": "candidate@example.com",
            "full_name": "Test Candidate"
        }
        job = {
            "id": 1,
            "title": "Développeur Python",
            "company": "Test Company"
        }
        match_score = 85

        # Envoi de la notification
        notification_service.notify_match(
            candidate=candidate,
            job=job,
            match_score=match_score
        )

        # Vérification que l'email a été envoyé
        mock_send_email.assert_called_once_with(
            recipient_email=candidate["email"],
            subject=f"Match trouvé : {job['title']}",
            content=f"Bonjour {candidate['full_name']},\n\n"
                   f"Nous avons trouvé un match intéressant pour vous :\n"
                   f"Poste : {job['title']}\n"
                   f"Entreprise : {job['company']}\n"
                   f"Score de correspondance : {match_score}%\n\n"
                   f"Connectez-vous pour plus de détails."
        ) 