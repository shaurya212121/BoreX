# BoreX / NWIS: Core Domain Services
# Re-exports for convenient importing from the services package

from .nearby_wells import find_nearby_wells, haversine_km
from .report_parser import parse_report_text, parse_report_file
from .risk_correlator import correlate
from .geological_correlator import GeologicalCorrelator
from .ml_risk_predictor import MLRiskPredictor
from .telemetry_provider import SyntheticTelemetryProvider, FutureERTMACProvider
from .nlp_ner_pipeline import NLPNERPipeline
from .document_ingestion import DocumentIngestionPipeline
from .pdf_generator import generate_risk_dossier_pdf
