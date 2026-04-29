import { ArrowLeft, Scale, FileCheck, UserCheck, Download, Trash2, Shield, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import SEO from '@/components/SEO';

const GDPR = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="GDPR — Vaše práva"
        description="Informácie o spracovaní osobných údajov v TakeMe podľa nariadenia GDPR (EÚ) 2016/679."
        path="/gdpr"
      />
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Späť
        </Button>

        <div className="space-y-8">
          <div className="text-center mb-12">
            <Scale className="w-16 h-16 mx-auto text-primary mb-4" />
            <h1 className="font-display text-4xl font-bold mb-4">GDPR - Vaše práva</h1>
            <p className="text-muted-foreground">
              Informácie o spracovaní osobných údajov podľa nariadenia GDPR (EÚ) 2016/679
            </p>
          </div>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <FileCheck className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Právny základ spracovania</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>Vaše osobné údaje spracovávame na základe:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Plnenie zmluvy (čl. 6 ods. 1 písm. b):</strong> Spracovanie je nevyhnutné na poskytnutie služby zdieľanej dopravy</li>
                <li><strong>Oprávnený záujem (čl. 6 ods. 1 písm. f):</strong> Bezpečnosť platformy, prevencia podvodov, zlepšovanie služieb</li>
                <li><strong>Súhlas (čl. 6 ods. 1 písm. a):</strong> Pre push notifikácie a marketingovú komunikáciu</li>
              </ul>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Vaše práva</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>Podľa GDPR máte nasledujúce práva:</p>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">Právo na prístup (čl. 15)</h3>
                  <p>Máte právo získať potvrdenie o tom, či sa spracúvajú vaše osobné údaje, a ak áno, máte právo získať prístup k týmto údajom.</p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">Právo na opravu (čl. 16)</h3>
                  <p>Máte právo na opravu nesprávnych osobných údajov. Toto môžete urobiť priamo vo svojom profile.</p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">Právo na vymazanie (čl. 17)</h3>
                  <p>Máte právo na vymazanie vašich osobných údajov („právo byť zabudnutý") za určitých podmienok.</p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">Právo na obmedzenie spracovania (čl. 18)</h3>
                  <p>Máte právo na obmedzenie spracovania vašich osobných údajov za určitých podmienok.</p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">Právo na prenosnosť údajov (čl. 20)</h3>
                  <p>Máte právo získať svoje osobné údaje v štruktúrovanom, bežne používanom a strojovo čitateľnom formáte.</p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">Právo namietať (čl. 21)</h3>
                  <p>Máte právo namietať proti spracovaniu vašich osobných údajov z dôvodov týkajúcich sa vašej konkrétnej situácie.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Download className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Ako uplatniť svoje práva</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>Pre uplatnenie vašich práv:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Kontaktujte nás e-mailom na <strong className="text-foreground">support@takeme.sk</strong></li>
                <li>Uveďte svoje meno a e-mailovú adresu spojenú s účtom</li>
                <li>Opíšte, ktoré právo chcete uplatniť</li>
                <li>Na vašu žiadosť odpovieme do 30 dní</li>
              </ol>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Zmazanie účtu</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>Pre úplné zmazanie účtu a všetkých súvisiacich údajov:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Pošlite e-mail na <strong className="text-foreground">support@takeme.sk</strong> s predmetom "Žiadosť o zmazanie účtu"</li>
                <li>Uveďte e-mailovú adresu vášho účtu</li>
                <li>Váš účet a údaje budú vymazané do 30 dní</li>
              </ol>
              <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-destructive flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <strong>Upozornenie:</strong> Zmazanie účtu je nevratné.
                </p>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Dozorný orgán</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>Ak sa domnievate, že spracovanie vašich osobných údajov porušuje GDPR, máte právo podať sťažnosť na:</p>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-semibold text-foreground">Úrad na ochranu osobných údajov SR</p>
                <p>Hraničná 12, 820 07 Bratislava 27</p>
                <p>Tel.: +421 2 3231 3214</p>
                <p>E-mail: statny.dozor@pdp.gov.sk</p>
                <p>Web: <a href="https://dataprotection.gov.sk" target="_blank" rel="noopener noreferrer" className="text-primary underline">dataprotection.gov.sk</a></p>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <FileCheck className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Prevádzkovateľ</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p>Prevádzkovateľom osobných údajov je:</p>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-semibold text-foreground">TakeMe s.r.o.</p>
                <p>Kontakt: support@takeme.sk</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default GDPR;
