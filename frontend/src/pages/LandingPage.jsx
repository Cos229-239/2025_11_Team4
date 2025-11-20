import { useNavigate } from 'react-router-dom';
import {
  QrCodeIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div
      className="
        min-h-screen 
        flex flex-col items-center justify-center 
        px-6 py-16 
        relative overflow-hidden 
        bg-[#000000]
      "
    >
      {/* BACKGROUND GRADIENT  */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
  background: `
    radial-gradient(circle at center,
      #E35504ff 0%,
      #E35504aa 15%,
      #000000 35%,
      #5F2F14aa 55%,
      #B5FF00ff 80%,
      #000000 100%
    )
  `,
  filter: "blur(20px)",
  backgroundSize: "180% 180%",
  opacity: 0.9,
}}

      ></div>

      {/* LOGO OFICIAL */}
      <div className="relative z-10 mb-10">
        <img
          src="/src/assets/logo-copa.png"
          alt="OrderEasy Logo"
          className="
            w-48 h-auto mx-auto 
            drop-shadow-[0_0_25px_rgba(0,0,0,0.45)]
            hover:scale-105 transition-transform duration-300
          "
        />
      </div>

      {/* TAGLINE */}
      <h1 className="relative z-10 text-center mb-20 leading-tight">
        <span className="block text-4xl sm:text-5xl lg:text-6xl font-semibold text-white font-['Playfair_Display'] italic">
          Let’s
        </span>

        <span className="block text-4xl sm:text-5xl lg:text-6xl font-semibold text-white font-['Playfair_Display'] italic">
          Dine without a whine
        </span>
      </h1>

      {/* CUSTOMER OPTION CARDS */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
        {/* CARD 1 */}
        <div className="
          bg-[#111111] rounded-3xl p-10 
          border border-[#222] 
          hover:border-brand-orange/60 
          transition-all duration-300 
          transform hover:-translate-y-2 hover:shadow-2xl 
          hover:shadow-brand-orange/20 group
        ">
          <div className="flex justify-center mb-6">
            <div className="bg-brand-orange/10 p-6 rounded-2xl group-hover:bg-brand-orange/20 transition-all">
              <QrCodeIcon className="w-20 h-20 text-brand-orange" />
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white text-center mb-3">Dine In</h2>

          <p className="text-gray-400 text-center mb-8 text-lg">
            Order from your table
          </p>

          <button
            onClick={() => navigate('/scan-qr')}
            className="
              w-full
              bg-brand-orange text-white
              px-8 py-4 rounded-full
              text-lg font-bold uppercase tracking-wide
              hover:bg-brand-orange/90
              transform hover:scale-105 active:scale-95
              transition-all duration-200
              shadow-xl shadow-brand-orange/30 hover:shadow-brand-orange/50
            "
          >
            Scan QR Code
          </button>
        </div>
            {/* CTA Button */}
            <button
              onClick={() => navigate('/qr-check')}
              className="
                w-full
                bg-brand-orange text-white
                px-8 py-4 rounded-full
                text-lg font-bold uppercase tracking-wide
                hover:bg-brand-orange/90
                transform hover:scale-105 active:scale-95
                transition-all duration-200
                shadow-xl shadow-brand-orange/30 hover:shadow-brand-orange/50
              "
            >
              Start Ordering
            </button>
          </div>

        {/* CARD 2 */}
        <div className="
          bg-[#111111] rounded-3xl p-10 
          border border-[#222] 
          hover:border-brand-lime/60 
          transition-all duration-300 
          transform hover:-translate-y-2 hover:shadow-2xl 
          hover:shadow-brand-lime/20 group
        ">
          <div className="flex justify-center mb-6">
            <div className="bg-brand-lime/10 p-6 rounded-2xl group-hover:bg-brand-lime/20 transition-all">
              <BuildingStorefrontIcon className="w-20 h-20 text-brand-lime" />
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white text-center mb-3">Browse Restaurants</h2>

          <p className="text-gray-400 text-center mb-8 text-lg">
            Explore delivery & takeout
          </p>

          <button
            onClick={() => navigate('/restaurants')}
            className="
              w-full
              bg-brand-lime text-black
              px-8 py-4 rounded-full
              text-lg font-bold uppercase tracking-wide
              hover:bg-brand-lime/90
              transform hover:scale-105 active:scale-95
              transition-all duration-200
              shadow-xl shadow-brand-lime/30 hover:shadow-brand-lime/50
            "
          >
            View Restaurants
          </button>
        </div>
      </div>

      {/* KITCHEN LINK */}
      <div className="relative z-10 text-center">
        <button
          onClick={() => navigate('/kitchen')}
          className="text-gray-500 hover:text-brand-orange transition-colors text-sm underline decoration-dotted underline-offset-4"
        >
          Kitchen Dashboard
        </button>
      </div>
    </div>
  );
};

export default LandingPage;