import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Smartphone, Check, Share, MoreVertical, Zap, Wifi, Bell, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '@/components/SEO';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect device
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /ipad|iphone|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isAndroidDevice = /android/.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const benefits = [
    { icon: Zap, title: 'Rýchlejší prístup', description: 'Spusti aplikáciu jedným kliknutím' },
    { icon: Wifi, title: 'Funguje offline', description: 'Základné funkcie aj bez internetu' },
    { icon: Bell, title: 'Push notifikácie', description: 'Buď vždy v obraze o tvojich jazdách' },
  ];

  const iosSteps = [
    { icon: Share, text: 'Klikni na ikonu zdieľania', subtext: 'Nájdeš ju v dolnej časti Safari' },
    { icon: 'plus', text: 'Vyber "Pridať na plochu"', subtext: 'Posuň sa dole v zozname možností' },
    { icon: Check, text: 'Potvrď kliknutím na "Pridať"', subtext: 'Aplikácia sa pridá na plochu' },
  ];

  const androidSteps = [
    { icon: MoreVertical, text: 'Otvor menu prehliadača', subtext: 'Tri bodky v pravom hornom rohu' },
    { icon: Download, text: 'Vyber "Nainštalovať aplikáciu"', subtext: 'Alebo "Pridať na plochu"' },
    { icon: Check, text: 'Potvrď inštaláciu', subtext: 'Aplikácia sa nainštaluje' },
  ];

  const steps = isIOS ? iosSteps : androidSteps;

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-md w-full border-0 shadow-lg">
            <CardContent className="pt-8 pb-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Check className="w-10 h-10 text-success-foreground" />
              </motion.div>
              <h1 className="text-2xl font-bold mb-2">Hotovo!</h1>
              <p className="text-muted-foreground mb-6">
                TakeMe je teraz na tvojej domovskej obrazovke. Môžeš ju spustiť kedykoľvek.
              </p>
              <Button onClick={() => navigate('/')} className="w-full" size="lg">
                Otvoriť aplikáciu
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Stiahnuť aplikáciu TakeMe"
        description="Nainštaluj si TakeMe ako PWA na iPhone alebo Android. Rýchle, bez sťahovania z App Store, push notifikácie a offline podpora."
        path="/install"
      />
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-4 pt-12 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md mx-auto text-center"
        >
          <div className="w-20 h-20 bg-primary-foreground/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow">
            <Smartphone className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Nainštaluj TakeMe</h1>
          <p className="text-primary-foreground/80">
            Pridaj aplikáciu na plochu a užívaj si plnohodnotný zážitok
          </p>
        </motion.div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-8">
        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-2">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="text-center p-3"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <benefit.icon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-xs font-medium">{benefit.title}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Install Button or Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg mb-6">
            <CardContent className="p-6">
              {deferredPrompt ? (
                <div className="text-center">
                  <h2 className="text-lg font-semibold mb-2">Pripravené na inštaláciu</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Klikni na tlačidlo a potvrď inštaláciu
                  </p>
                  <Button onClick={handleInstall} className="w-full" size="lg">
                    <Download className="w-5 h-5 mr-2" />
                    Nainštalovať teraz
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">
                      {isIOS ? 'Inštalácia na iPhone' : 'Inštalácia na Android'}
                    </h2>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {isIOS ? 'Safari' : 'Chrome'}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {steps.map((step, index) => (
                      <motion.button
                        key={index}
                        onClick={() => setCurrentStep(index)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className={`w-full flex items-start gap-4 p-4 rounded-xl transition-all text-left ${
                          currentStep === index 
                            ? 'bg-primary/10 border-2 border-primary' 
                            : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          currentStep === index 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted-foreground/20 text-muted-foreground'
                        }`}>
                          {step.icon === 'plus' ? (
                            <span className="text-lg font-bold">+</span>
                          ) : (
                            <step.icon className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold ${
                              currentStep === index ? 'text-primary' : 'text-muted-foreground'
                            }`}>
                              KROK {index + 1}
                            </span>
                          </div>
                          <p className="font-medium text-sm">{step.text}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{step.subtext}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {isIOS && currentStep === 0 && (
                    <>
                      {/* Animated arrow pointing to Share button */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="fixed bottom-0 left-0 right-0 pointer-events-none z-50"
                      >
                        <div className="relative h-32">
                          {/* Pulsing highlight circle */}
                          <motion.div
                            animate={{ 
                              scale: [1, 1.3, 1],
                              opacity: [0.6, 0.2, 0.6]
                            }}
                            transition={{ 
                              duration: 1.5, 
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-primary/30"
                          />
                          
                          {/* Arrow pointing down */}
                          <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{ 
                              duration: 1, 
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center"
                          >
                            <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium whitespace-nowrap">
                              Klikni sem ↓
                            </div>
                            <svg 
                              width="24" 
                              height="40" 
                              viewBox="0 0 24 40" 
                              className="text-primary mt-1"
                            >
                              <path 
                                d="M12 0 L12 32 M4 24 L12 34 L20 24" 
                                stroke="currentColor" 
                                strokeWidth="3" 
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </motion.div>

                          {/* Share icon indicator */}
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ 
                              duration: 1.5, 
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg"
                          >
                            <Share className="w-5 h-5 text-primary-foreground" />
                          </motion.div>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20"
                      >
                        <p className="text-xs text-foreground">
                          <strong>Pozri dole!</strong> Šípka ti ukazuje kde nájdeš ikonu zdieľania v Safari.
                        </p>
                      </motion.div>
                    </>
                  )}

                  {isIOS && currentStep !== 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20"
                    >
                      <p className="text-xs text-warning-foreground">
                        <strong>Tip:</strong> Uisti sa, že používaš Safari prehliadač. V iných prehliadačoch táto funkcia nemusí fungovať.
                      </p>
                    </motion.div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Continue in browser */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pb-8"
        >
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')} 
            className="w-full text-muted-foreground"
          >
            Pokračovať v prehliadači
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Install;
