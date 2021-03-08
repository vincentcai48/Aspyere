import React from "react";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer>
      <div>&copy; Copyright Asypere 2020. All Rights Reserved</div>
      <ul id="legal-links">
        <li>
          <Link className="legal-link" to="/privacypolicy">
            Privacy Policy
          </Link>
        </li>
        <li>
          <Link className="legal-link" to="/termsandconditions">
            Terms and Conditions
          </Link>
        </li>
        <li>
          <Link className="legal-link" to="/disclaimers">
            Disclaimers
          </Link>
        </li>
        <li>
          <Link className="legal-link" to="/contact">
            Contact
          </Link>
        </li>
      </ul>
    </footer>
  );
}

export default Footer;
