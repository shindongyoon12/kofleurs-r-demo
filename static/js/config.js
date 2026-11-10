// Page settings: the only place to edit before publishing.
window.KOFLEURS_CONFIG = {
  // Blind review: set showAuthors to false. The page then loads no author file, so it shows no
  // author names, no affiliation and no Paper button, and the BibTeX entry is anonymous.
  // Names, affiliation and the paper link are kept only in authorsFile; for a public blind
  // deployment also leave out that file and static/pdfs/ (see demo/DEPLOY.md).
  showAuthors: true,
  authorsFile: "static/js/authors.js",

  // Draft review notes (Korean), TODO badges and the candidates page link. false for publication.
  reviewMode: false,

  bibtex: {
    booktitle: "",      // proceedings name: not in the paper PDF; the line is left out while empty
    year: "2027",       // from the venue name ICEIC 2027 (not in the paper PDF)
  },
};
