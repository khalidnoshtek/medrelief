import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiApi } from '../../api';
import { CameraCapture } from '../../components/common/camera-capture';
import { BigButton, Spinner, Alert } from '../../components/ui/primitives';
import { useVisit } from './visit-context';

export default function CapturePage() {
  const navigate = useNavigate();
  const { draft, update } = useVisit();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const handleCaptured = async (dataUrl: string) => {
    setCapturedImage(dataUrl);
    setError('');
    setProcessing(true);
    try {
      const { prescription_image_url, extracted } = await aiApi.extractPrescription(dataUrl);
      const confidence: Record<string, 'high' | 'medium' | 'low'> = {
        patient_name: extracted.patient_name?.confidence || 'low',
        gender: extracted.gender?.confidence || 'low',
        age: extracted.age_years?.confidence || 'low',
        mobile: extracted.mobile?.confidence || 'low',
        doctor: extracted.doctor_name?.confidence || 'low',
        tests: extracted.tests?.confidence || 'low',
      };

      update({
        prescriptionImageUrl: prescription_image_url,
        extractionProvider: extracted.provider_used,
        patientName: extracted.patient_name?.value || undefined,
        gender: extracted.gender?.value || undefined,
        ageYears: extracted.age_years?.value || undefined,
        mobile: extracted.mobile?.value || undefined,
        referrerName: extracted.doctor_name?.value || undefined,
        referrerSpecialty: extracted.doctor_specialty?.value || undefined,
        // Default to NOT_APPLICABLE — only set FASTING/NON_FASTING if AI is explicit
        fastingStatus: extracted.fasting_required?.value === true ? 'FASTING'
          : extracted.fasting_required?.value === false ? 'NON_FASTING'
          : 'NOT_APPLICABLE',
        fieldConfidence: confidence,
      });
      navigate('/visit/verify');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Extraction failed — you can enter details manually');
    } finally {
      setProcessing(false);
    }
  };

  const skipToManual = () => {
    update({ prescriptionImageUrl: undefined });
    navigate('/visit/verify');
  };

  return (
    <div className="p-5 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">New Visit</h1>
        <p className="text-sm text-gray-500">Step 1 of 4 • Capture prescription</p>
      </div>

      <CameraCapture onCapture={handleCaptured} />

      {processing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Spinner />
          <div>
            <p className="text-sm font-medium text-blue-800">Reading prescription...</p>
            <p className="text-xs text-blue-600">AI is extracting patient name, age, doctor, tests</p>
          </div>
        </div>
      )}

      {error && <Alert tone="warn">{error}</Alert>}

      <div className="pt-2">
        <BigButton tone="secondary" onClick={skipToManual}>Enter details manually</BigButton>
      </div>
    </div>
  );
}
