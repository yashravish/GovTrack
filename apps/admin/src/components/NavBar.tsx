import { NavLink } from 'react-router-dom';

export function NavBar() {
  return (
    <header className="topbar">
      <NavLink to="/" className="topbar__brand" aria-label="GovTrack Admin home">
        GovTrack Admin
      </NavLink>
      <nav aria-label="Primary">
        <ul className="topbar__links" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <NavLink to="/" end className="topbar__link">
              Feed health
            </NavLink>
          </li>
          <li>
            <NavLink to="/datasets" className="topbar__link">
              Datasets
            </NavLink>
          </li>
        </ul>
      </nav>
    </header>
  );
}
