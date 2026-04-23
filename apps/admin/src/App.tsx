import { Routes, Route, Navigate } from 'react-router-dom';

import { NavBar } from './components/NavBar';
import { FeedHealthPage } from './pages/FeedHealthPage';
import { DatasetsPage } from './pages/DatasetsPage';

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <NavBar />
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<FeedHealthPage />} />
          <Route path="/datasets" element={<DatasetsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
