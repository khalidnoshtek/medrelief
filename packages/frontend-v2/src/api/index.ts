import api from './client';

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }).then((r) => r.data.data),
};

export const aiApi = {
  extractPrescription: (imageBase64: string) =>
    api.post('/ai/extract-prescription', { image_base64: imageBase64 }).then((r) => r.data.data),
  suggestTests: (specialty: string) =>
    api.get('/ai/suggest-tests', { params: { specialty } }).then((r) => r.data.data),
};

export const mdmApi = {
  searchPatients: (mobile: string) =>
    api.get('/patients', { params: { mobile } }).then((r) => r.data.data),
  createPatient: (data: any) =>
    api.post('/patients', data).then((r) => r.data.data),
  getTests: (search?: string) =>
    api.get('/mdm/tests', { params: { search } }).then((r) => r.data.data),
  getDoctors: () => api.get('/mdm/doctors').then((r) => r.data.data),
  createDoctor: (data: { name: string; specialty?: string; mobile?: string }) =>
    api.post('/mdm/doctors', data).then((r) => r.data.data),
  getBranches: () => api.get('/mdm/branches').then((r) => r.data.data),
};

export const billingApi = {
  previewPrices: (data: any) =>
    api.post('/billing/preview-prices', data).then((r) => r.data.data),
  createBill: (data: any) =>
    api.post('/billing/bills', data).then((r) => r.data.data),
  getBill: (id: string) => api.get(`/billing/bills/${id}`).then((r) => r.data.data),
  searchBills: (params: any) =>
    api.get('/billing/bills', { params }).then((r) => r.data),
  recordPayment: (data: any) =>
    api.post('/billing/payments', data).then((r) => r.data.data),
  getQr: (billId: string) =>
    api.get(`/billing/bills/${billId}/qr`).then((r) => r.data.data),
  getByQr: (payload: string) =>
    api.get(`/billing/bills/by-qr/${payload}`).then((r) => r.data.data),
  printBill: async (billId: string) => {
    const r = await api.get(`/billing/bills/${billId}/print`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
    window.open(url, '_blank');
  },
  upiQr: (billId: string, amount: number) =>
    api.post('/billing/upi/generate-qr', { bill_id: billId, amount }).then((r) => r.data.data),
};

export const limsApi = {
  getAccession: (id: string) => api.get(`/lims/accessions/${id}`).then((r) => r.data.data),
  getAccessionByBill: (billId: string) =>
    api.get(`/lims/accessions/by-bill/${billId}`).then((r) => r.data.data),
  collectSample: (id: string) => api.patch(`/lims/samples/${id}/collect`).then((r) => r.data.data),
  receiveSample: (id: string) => api.patch(`/lims/samples/${id}/receive`).then((r) => r.data.data),
  rejectSample: (id: string, reason: string) =>
    api.patch(`/lims/samples/${id}/reject`, { reason }).then((r) => r.data.data),
  getWorklist: (params?: any) =>
    api.get('/lims/worklist', { params }).then((r) => r.data),
  startProcessing: (id: string) =>
    api.patch(`/lims/test-orders/${id}/start`).then((r) => r.data.data),
  enterResult: (data: any) => api.post('/lims/results', data).then((r) => r.data.data),
  getResultsByAccession: (id: string) =>
    api.get(`/lims/results/accession/${id}`).then((r) => r.data.data),
  signOff: (id: string, comments?: string) =>
    api.post(`/lims/results/${id}/sign-off`, { comments }).then((r) => r.data.data),
  printLabels: async (accessionId: string) => {
    const r = await api.get(`/lims/accessions/${accessionId}/labels`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
    window.open(url, '_blank');
  },
  getReportsByAccession: (id: string) =>
    api.get(`/reports?accession_id=${id}`).then((r) => r.data.data),
  resendReport: (id: string, channel: string) =>
    api.post(`/reports/${id}/resend`, { channel }).then((r) => r.data.data),
  downloadReport: async (id: string) => {
    const r = await api.get(`/reports/${id}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
    window.open(url, '_blank');
  },
};

export const financeApi = {
  getDashboard: (branchId: string) =>
    api.get('/finance/dashboard', { params: { branch_id: branchId } }).then((r) => r.data.data),
  dailyClose: (branchId: string) =>
    api.post('/finance/daily-close', { branch_id: branchId }).then((r) => r.data.data),
  getDailyCloseHistory: (branchId: string) =>
    api.get('/finance/daily-close', { params: { branch_id: branchId } }).then((r) => r.data.data),
};
