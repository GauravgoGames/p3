import { Link } from 'wouter';
import { Instagram } from 'lucide-react';

// Simplified footer without visitor counter
const Footer = () => {

  return (
    <footer className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 text-white py-6 animate-gradient-x">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-bold font-heading">ProAce Predictions</h3>
            <p className="text-neutral-300 text-sm">Cricket match predictions platform</p>
          </div>

          <div className="flex space-x-8 mb-4 md:mb-0">
            <Link href="/" className="text-white/80 hover:text-yellow-300 text-sm font-medium">
              Home
            </Link>
            <Link href="/#leaderboard" className="text-white/80 hover:text-yellow-300 text-sm font-medium">
              Leaderboard
            </Link>
            <Link href="/profile" className="text-white/80 hover:text-yellow-300 text-sm font-medium">
              My Profile
            </Link>
            <Link href="/help" className="text-white/80 hover:text-yellow-300 text-sm font-medium">
              Help
            </Link>
            <a href="https://www.pro-ace-predictions.co.uk/contact/" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-yellow-300 text-sm font-medium">
              Contact Us
            </a>
            <a href="https://www.pro-ace-predictions.co.uk/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-yellow-300 text-sm font-medium">
              Privacy Policy
            </a>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <div className="flex space-x-4">
              <a href="https://www.instagram.com/proacepredictions/" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-yellow-300">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 mt-4 pt-4">
          <p className="text-white/80 text-center text-sm font-medium">© {new Date().getFullYear()} ProAce Predictions. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;