import './navbar.css'; // Link your CSS file here
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";



const Navbar = () => {
    const navigate = useNavigate();
    const handleLogoClick = () => {
        navigate("/");
    };

    const handleLogout = () => {
        Cookies.remove("accessToken");
        Cookies.remove("refreshToken");
        navigate("/login");
    };
    return (
        <nav className="navbar">
            <div className="navbar-logo" onClick={handleLogoClick}>
                <h2>Content Loop</h2>
            </div>
            <div className="navbar-actions">
                <button onClick={handleLogout}>Logout</button>
            </div>
        </nav>
    );
};

export default Navbar;
