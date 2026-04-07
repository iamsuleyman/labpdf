import { DEFAULT_PATIENT, DEFAULT_DOCTOR } from './constants.js';

export function resolveOptions(options) {
  const src = options || {};
  const legacyPatient = src.patient || src.user || {};

  const patient = {
    ...DEFAULT_PATIENT,
    name: legacyPatient.name || '',
    patientId: legacyPatient.patientId || '',
    specimenId: '', // always set from report sampleId at render time
    dob: legacyPatient.dob || '',
    age: legacyPatient.age || '',
    sex: legacyPatient.sex || '',
    phone: legacyPatient.phone || '',
  };

  const doctor = {
    ...DEFAULT_DOCTOR,
    name: (src.doctor && src.doctor.name) || legacyPatient.orderingPhysician || legacyPatient.physicianName || '',
    accountNumber: (src.doctor && src.doctor.accountNumber) || legacyPatient.accountNumber || '',
    phone: (src.doctor && src.doctor.phone) || legacyPatient.physicianPhone || '',
  };

  if (!patient.name) {
    throw new Error('LabPdf.generatePDF requires options.patient with at least a name.');
  }

  return { patient, doctor };
}
