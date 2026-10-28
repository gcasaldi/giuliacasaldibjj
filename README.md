# Giulia Casaldi — Brazilian Jiu-Jitsu
Sito ufficiale e portfolio sportivo di Giulia Casaldi, atleta italiana di Brazilian Jiu-Jitsu.

**Sito:** https://gcasaldi.github.io/giuliacasaldibjj/

## Pubblicazione
Questo repository è un sito statico per GitHub Pages. In **Settings → Pages** selezionare **Deploy from a branch** → **main** → **/(root)**, se non già configurato.

## SEO incluso
- Titolo e descrizione specifici per ricerche «Giulia Casaldi BJJ / Brazilian Jiu-Jitsu»
- URL canoniche, Open Graph e marcatura `Person` con Schema.org
- Homepage italiana e pagina inglese (`/en/`) con `hreflang`
- `sitemap.xml`, pagine semanticamente accessibili, link a risultati primari
- Responsive, zero framework e nessun tracciamento

**Nota:** il file `robots.txt` sotto il sottopercorso GitHub Pages non sostituisce il robots.txt all'origine del dominio. La sitemap è direttamente raggiungibile e può essere inviata a Google Search Console.

## Materiale per stampa e organizzatori

- [Press kit bilingue con biografia breve, piazzamenti e fonti primarie](docs/press-kit.md). Le fotografie non sono incluse finché non siano disponibili originali autorizzati.

## Fonti risultati
- UIJJ [Roma Jiu Jitsu Challenge 2022](https://www.uijj.org/it/elenco-gare/roma-jiu-jitsu-challenge-2022)
- UIJJ [Milano Jiu Jitsu Challenge 2022](https://www.uijj.org/it/elenco-gare/milano-jiu-jitsu-challenge-2022)
- [AJP Tour Rome International Pro](https://ajptour.com/de/event/522/schedule/matchlist?page=7)
- [Italia Open — Smoothcomp](https://bjjitalia.smoothcomp.com/en/event/7042/schedule/matchlist)

## Miglioramenti successivi
1. Aggiungere almeno 2 fotografie originali con autorizzazione: un ritratto sportivo verticale e una fotografia in gara. Esportare in WebP compresso e includere `alt` descrittivo.
2. Creare una `social-cover.jpg` con una fotografia reale e aggiungere il relativo `og:image`.
3. Confermare altre medaglie con fonti ufficiali prima di pubblicarle.
4. Collegare un dominio personalizzato e aggiornare tutti gli URL canonici e la sitemap.
5. Verificare la proprietà su Google Search Console, inviare la sitemap e monitorare indicizzazione/ricerche.
6. Aggiornare annualmente risultati, grado e percorso agonistico.

Nessun titolo mondiale/nazionale viene dichiarato senza prova. Il termine campionessa descrive la vittoria effettivamente documentata nell'assoluto della competizione Roma Jiu Jitsu Challenge 2022.

## Verifica SEO locale (offline)

Prima di pubblicare modifiche a pagine, menu o metadati, eseguire dalla root:

```sh
node scripts/verify-site.mjs
```

Il controllo, senza dipendenze né chiamate Internet, verifica per IT/EN: lingua, title e description, canonical, Open Graph URL, hreflang, ID duplicati, link interni e asset locali, alt delle immagini, JSON-LD Person e URL della sitemap. Restituisce codice di uscita 1 in caso di errore. **Non** certifica l'indicizzazione Google, l'accessibilità completa, il contenuto dei risultati agonistici o il funzionamento di link esterni. Non avvia GitHub Actions o deploy.
