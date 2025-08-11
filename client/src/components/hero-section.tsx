import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

// Cricket ball animation component
const CricketBall = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    className="absolute w-8 h-8 bg-red-500 rounded-full shadow-lg"
    style={{
      background: 'radial-gradient(circle at 30% 30%, #ff6b6b, #cc5757)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset -2px -2px 4px rgba(0,0,0,0.2)'
    }}
    initial={{ x: -50, y: 50, rotate: 0 }}
    animate={{
      x: ['-50px', '150px', '350px', '550px'],
      y: ['50px', '20px', '30px', '80px'],
      rotate: [0, 180, 360, 540]
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  >
    {/* Cricket ball seam */}
    <div className="absolute inset-0 rounded-full border-2 border-white/30"></div>
    <div className="absolute top-1/2 left-1/4 w-1/2 h-0.5 bg-white/40 rounded transform -translate-y-1/2"></div>
  </motion.div>
);

// Cricket bat animation component  
const CricketBat = () => (
  <motion.div
    className="absolute bottom-10 right-10 w-16 h-4"
    initial={{ rotate: 45, opacity: 0.7 }}
    animate={{ 
      rotate: [45, 20, 45],
      y: [0, -5, 0]
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  >
    <div className="w-12 h-3 bg-gradient-to-r from-amber-600 to-amber-800 rounded-r-lg rounded-l-sm"></div>
    <div className="w-4 h-12 bg-gradient-to-b from-amber-700 to-amber-900 rounded-t-sm -mt-1 ml-8"></div>
  </motion.div>
);

// Stadium lights effect
const StadiumLights = () => (
  <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 bg-yellow-300 rounded-full"
        style={{
          left: `${15 + i * 15}%`,
          top: '10%',
          filter: 'blur(1px)',
          boxShadow: '0 0 10px rgba(255, 255, 0, 0.6)'
        }}
        animate={{
          opacity: [0.3, 1, 0.3],
          scale: [1, 1.2, 1]
        }}
        transition={{
          duration: 2,
          delay: i * 0.3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    ))}
  </div>
);

const HeroSection = () => {
  const { user } = useAuth();

  return (
    <section className="mb-10 relative overflow-hidden rounded-xl">
      <div 
        className="h-80 bg-cover bg-center rounded-xl relative" 
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=600')" 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/90 to-blue-600/90 rounded-xl"></div>
        
        {/* Animated cricket elements */}
        <CricketBall delay={0} />
        <CricketBall delay={2} />
        <CricketBat />
        <StadiumLights />
        
        {/* Floating cricket icons */}
        <motion.div
          className="absolute top-20 left-10 text-white/20 text-6xl"
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 5, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          🏏
        </motion.div>
        
        <motion.div
          className="absolute bottom-20 left-20 text-white/20 text-4xl"
          animate={{ 
            y: [0, -8, 0],
            x: [0, 5, 0]
          }}
          transition={{
            duration: 2.5,
            delay: 1,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          🏆
        </motion.div>

        <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1 
              className="text-4xl md:text-5xl font-bold text-white mb-4 font-heading"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Cricket Match Predictions
            </motion.h1>
            <motion.p 
              className="text-xl text-white mb-6 max-w-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Predict match winners, win points, climb the leaderboard
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {user ? (
                <Link href="/predict">
                  <Button className="px-6 py-3 bg-accent hover:bg-accent/90 text-white font-medium rounded-md shadow-lg transition-all duration-300 transform hover:scale-105">
                    Start Predicting
                  </Button>
                </Link>
              ) : (
                <Link href="/auth">
                  <Button className="px-6 py-3 bg-accent hover:bg-accent/90 text-white font-medium rounded-md shadow-lg transition-all duration-300 transform hover:scale-105">
                    Sign Up & Predict
                  </Button>
                </Link>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
