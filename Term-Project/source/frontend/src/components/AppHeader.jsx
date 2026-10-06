import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const links = [
  ['/', 'Dashboard'],
  ['/schedules', 'Find a shuttle'],
];

function AppHeader() {
  const { session, signOut } = useAuth();
  return (
    <header className="site-header">
      <div className="container header-inner">
        <div>
          <p className="eyebrow">RMUTL • CAMPUS TRANSIT</p>
          <p className="brand">Shuttle Booking</p>
        </div>
        <nav aria-label="เมนูหลัก">
          {links.map(([to, label]) => (
            <NavLink
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              end={to === '/'}
              key={to}
              to={to}
            >
              {label}
            </NavLink>
          ))}
          {session ? (
            <>
              <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/bookings">My Bookings</NavLink>
              <button className="nav-link nav-action" type="button" onClick={signOut}>
                Sign out · {session.user.name}
              </button>
            </>
          ) : (
            <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/login">
              Login
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

export default AppHeader;
