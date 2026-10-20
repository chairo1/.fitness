import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { IS_ADMIN_HOST } from './config';

// Each host only downloads its own app.
const Root = IS_ADMIN_HOST ? lazy(() => import('./admin/AdminApp')) : lazy(() => import('./App'));

if (IS_ADMIN_HOST) document.title = 'Admin panel · Fitness Coach';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Root />
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
);
