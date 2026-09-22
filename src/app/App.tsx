import { Navigate, Route, Routes } from 'react-router-dom';
import { ReportFormScreen } from '../features/report-form/ReportFormScreen';
import { ReportListScreen } from '../features/report-list/ReportListScreen';
import { Layout } from './Layout';

/** Routes per DESIGN §4.1; an unknown path lands on the list rather than on nothing. */
export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/reports" element={<ReportListScreen />} />
        <Route path="/reports/new" element={<ReportFormScreen />} />
        <Route path="*" element={<Navigate to="/reports" replace />} />
      </Routes>
    </Layout>
  );
}
