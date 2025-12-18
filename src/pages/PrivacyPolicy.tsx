import { ArrowLeft, Shield, Database, Eye, Lock, Mail, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Späť
        </Button>

        <div className="space-y-8">
          <div className="text-center mb-12">
            <Shield className="w-16 h-16 mx-auto text-primary mb-4" />
            <h1 className="font-display text-4xl font-bold mb-4">Zásady ochrany súkromia</h1>
            <p className="text-muted-foreground">Posledná aktualizácia: {new Date().toLocaleDateString('sk-SK')}</p>
          </div>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">1. Aké údaje zbierame</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>V aplikácii TakeMe zbierame nasledujúce osobné údaje:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Registračné údaje:</strong> meno, e-mailová adresa</li>
                <li><strong>Profilové údaje:</strong> telefónne číslo, popis profilu, fotografia</li>
                <li><strong>Údaje o vozidle (vodiči):</strong> model auta, farba, ŠPZ</li>
                <li><strong>Údaje o polohe:</strong> GPS súradnice počas aktívnej jazdy</li>
                <li><strong>Údaje o jazdách:</strong> trasy, časy, hodnotenia</li>
              </ul>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">2. Ako údaje používame</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>Vaše údaje používame na:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Poskytovanie služieb zdieľaného cestovania</li>
                <li>Spárovanie vodičov s cestujúcimi</li>
                <li>Sledovanie polohy vozidla v reálnom čase</li>
                <li>Odosielanie push notifikácií o stave jazdy</li>
                <li>Výpočet a zobrazenie hodnotení používateľov</li>
                <li>Riešenie sporov a sťažností</li>
                <li>Zlepšovanie našich služieb</li>
              </ul>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">3. Zdieľanie údajov</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>Vaše údaje zdieľame iba v týchto prípadoch:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>S ostatnými používateľmi:</strong> Základné profilové údaje (meno, hodnotenie) sú viditeľné pri prehliadaní jázd. Kontaktné údaje (telefón, ŠPZ) sú zdieľané až po potvrdení rezervácie.</li>
                <li><strong>S poskytovateľmi služieb:</strong> Využívame cloudové služby na uloženie dát a mapové služby na zobrazenie trás.</li>
                <li><strong>Na základe zákona:</strong> Ak to vyžadujú právne predpisy alebo súdne nariadenia.</li>
              </ul>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">4. Bezpečnosť údajov</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>Bezpečnosť vašich údajov berieme vážne:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Všetky údaje sú šifrované pri prenose (HTTPS/TLS)</li>
                <li>Prístup k databáze je chránený politikami prístupu na úrovni riadkov (RLS)</li>
                <li>Citlivé údaje (telefón, ŠPZ) sú viditeľné iba pre potvrdených účastníkov jazdy</li>
                <li>Heslá sú uložené pomocou bezpečného hashovania</li>
              </ul>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">5. Uchovávanie a mazanie údajov</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>Vaše údaje uchovávame počas trvania vášho účtu. Po zmazaní účtu:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Osobné údaje sú vymazané do 30 dní</li>
                <li>Anonymizované údaje o jazdách môžu byť uchovávané pre štatistické účely</li>
                <li>Hodnotenia a recenzie zostávajú v systéme</li>
              </ul>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">6. Kontakt</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>Pre otázky týkajúce sa ochrany súkromia nás kontaktujte:</p>
              <p className="font-semibold text-foreground">podpora@takeme.sk</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
