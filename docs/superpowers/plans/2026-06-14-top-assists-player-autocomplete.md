# Top Assists + Player Autocomplete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Top Assists prediction field to the tournament page and upgrade both Golden Boot and Top Assists inputs to player autocomplete fields backed by a static WC2026 player list.

**Architecture:** A new `PlayerAutocomplete` component filters a static `WC2026_PLAYERS` array as the user types and shows up to 8 suggestions in a dropdown; free-text entry is always allowed. The `TournamentPrediction` schema gains `topAssist String?`, scoring gains 10 pts for that field, and every caller of `calculateTournamentPoints` is updated to pass the new field.

**Tech Stack:** Next.js 15, React, Prisma (PostgreSQL), TypeScript, shadcn/ui (Input)

---

### Task 1: Add `topAssist` to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma:111-123`

- [ ] **Step 1: Add `topAssist` field to `TournamentPrediction`**

In `prisma/schema.prisma`, change the `TournamentPrediction` model from:

```prisma
model TournamentPrediction {
  id        String           @id @default(cuid())
  userId    String
  champion  String?
  topScorer String?
  window    PredictionWindow @default(INITIAL)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, window])
}
```

to:

```prisma
model TournamentPrediction {
  id        String           @id @default(cuid())
  userId    String
  champion  String?
  topScorer String?
  topAssist String?
  window    PredictionWindow @default(INITIAL)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, window])
}
```

- [ ] **Step 2: Push schema to database**

```bash
cd /Users/ashkan/Code/worldcup26 && npm run db:push
```

Expected: `✓ Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Verify TypeScript is happy**

```bash
cd /Users/ashkan/Code/worldcup26 && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

---

### Task 2: Add `WC2026_PLAYERS` constant

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Append the player list to `src/lib/constants.ts`**

Add this to the end of `src/lib/constants.ts`:

```typescript
export const WC2026_PLAYERS: string[] = [
  // Argentina
  "Alexis Mac Allister", "Ángel Di María", "Cristian Romero", "Emiliano Martínez",
  "Enzo Fernández", "Germán Pezzella", "Guido Rodríguez", "Julián Álvarez",
  "Lautaro Martínez", "Leandro Paredes", "Lionel Messi", "Lisandro Martínez",
  "Nahuel Molina", "Nicolás González", "Nicolás Tagliafico", "Paulo Dybala",
  "Rodrigo De Paul", "Thiago Almada", "Valentín Carboni",
  // Australia
  "Aaron Mooy", "Adam Taggart", "Ajdin Hrustic", "Harry Souttar",
  "Jackson Irvine", "Kusini Yengi", "Marco Tilio", "Martin Boyle",
  "Mathew Leckie", "Mathew Ryan", "Miloš Degenek", "Mitchell Duke",
  "Nathaniel Atkinson", "Riley McGree", "Tom Rogic",
  // Belgium
  "Amadou Onana", "Arthur Theate", "Charles De Ketelaere", "Kevin De Bruyne",
  "Leandro Trossard", "Loïs Openda", "Nicolas Raskin", "Simon Mignolet",
  "Thibaut Courtois", "Thomas Meunier", "Timothy Castagne", "Wout Faes",
  "Yannick Carrasco", "Youri Tielemans", "Zeno Debast",
  // Bolivia
  "Boris Céspedes", "Carlos Lampe", "Fernando Saucedo", "Marcelo Moreno Martins",
  "Ramiro Vaca", "Rodrigo Ramallo",
  // Brazil
  "Alisson Becker", "Antony", "Bruno Guimarães", "Casemiro",
  "Douglas Luiz", "Éder Militão", "Ederson", "Endrick",
  "Gabriel Magalhães", "Gabriel Martinelli", "Gerson", "João Gomes",
  "Lucas Paquetá", "Marquinhos", "Pedro", "Raphinha",
  "Richarlison", "Rodrygo", "Savinho", "Vinicius Junior",
  "Wendell",
  // Cameroon
  "André-Frank Zambo Anguissa", "André Onana", "Bryan Mbeumo",
  "Collins Fai", "Devis Epassy", "Eric Maxim Choupo-Moting",
  "Jean-Charles Castelletto", "Karl Toko Ekambi", "Martin Hongla",
  "Moumi Ngamaleu", "Samuel Oum Gouet", "Vincent Aboubakar",
  // Canada
  "Alphonso Davies", "Alistair Johnston", "Cyle Larin", "Derek Cornelius",
  "Ismaël Koné", "Jonathan David", "Jonathan Osorio", "Kamal Miller",
  "Lucas Cavallini", "Mark-Anthony Kaye", "Maxime Crépeau", "Milan Borjan",
  "Richie Laryea", "Stephen Eustáquio", "Tajon Buchanan",
  // Chile
  "Alexis Sánchez", "Arturo Vidal", "Ben Brereton Díaz", "Charles Aránguiz",
  "Darío Osorio", "Diego Valdés", "Eduardo Vargas", "Erick Pulgar",
  "Gary Medel", "Marcelo Allende", "Víctor Dávila",
  // Colombia
  "Carlos Cuesta", "Cucho Hernández", "Dávinson Sánchez", "James Rodríguez",
  "Jhon Arias", "Jhon Córdoba", "Juan Quintero", "Luis Díaz",
  "Mateus Uribe", "Miguel Ángel Borja", "Rafael Santos Borré",
  "Richard Ríos", "Wilmar Barrios", "Yerry Mina",
  // Costa Rica
  "Anthony Contreras", "Bryan Oviedo", "Celso Borges", "Francisco Calvo",
  "Joel Campbell", "Kendall Waston", "Keylor Navas", "Yeltsin Tejeda",
  // Croatia
  "Andrej Kramarić", "Ante Budimir", "Borna Sosa", "Bruno Petković",
  "Dejan Lovren", "Dominik Livaković", "Duje Ćaleta-Car", "Ivan Perišić",
  "Joško Gvardiol", "Josip Gvardiol", "Lovro Majer", "Luka Ivanušec",
  "Luka Modrić", "Marcelo Brozović", "Martin Erlić", "Mateo Kovačić",
  // Ecuador
  "Ángel Mena", "Ángelo Preciado", "Carlos Gruezo", "Djorkaeff Reasco",
  "Enner Valencia", "Gonzalo Plata", "Hernán Galíndez", "Jackson Porozo",
  "Jeremy Sarmiento", "John Yeboah", "Michael Estrada", "Moisés Caicedo",
  "Pervis Estupiñán", "Piero Hincapié", "Robert Arboleda", "Romario Ibarra",
  // Egypt
  "Ahmed Hegazi", "Amr El Sulaya", "Mohamed El-Shenawy", "Mohamed Elneny",
  "Mohamed Salah", "Mostafa Mohamed", "Omar Marmoush", "Tarek Hamed",
  // England
  "Aaron Ramsdale", "Bukayo Saka", "Cole Palmer", "Declan Rice",
  "Eberechi Eze", "Ezri Konsa", "Harry Kane", "Harry Maguire",
  "Jack Grealish", "John Stones", "Jordan Pickford", "Jude Bellingham",
  "Kieran Trippier", "Kobbie Mainoo", "Kyle Walker", "Levi Colwill",
  "Luke Shaw", "Marc Guéhi", "Marcus Rashford", "Nick Pope",
  "Ollie Watkins", "Phil Foden", "Raheem Sterling", "Reece James",
  "Trent Alexander-Arnold",
  // France
  "Adrien Rabiot", "Alphonse Areola", "Antoine Griezmann", "Aurélien Tchouaméni",
  "Benjamin Pavard", "Bradley Barcola", "Christopher Nkunku", "Dayot Upamecano",
  "Eduardo Camavinga", "Jules Koundé", "Kingsley Coman", "Kylian Mbappé",
  "Marcus Thuram", "Mike Maignan", "Ousmane Dembélé", "Randal Kolo Muani",
  "Théo Hernández", "Warren Zaïre-Emery", "William Saliba", "Youssouf Fofana",
  // Germany
  "Antonio Rüdiger", "Benjamin Henrichs", "Chris Führich", "David Raum",
  "Florian Wirtz", "İlkay Gündoğan", "Jamal Musiala", "Joshua Kimmich",
  "Kai Havertz", "Leroy Sané", "Manuel Neuer", "Marc-André ter Stegen",
  "Maximilian Mittelstädt", "Niclas Füllkrug", "Niklas Süle", "Pascal Groß",
  "Robert Andrich", "Serge Gnabry", "Thilo Kehrer",
  // Ghana
  "Alexander Djiku", "André Ayew", "Antoine Semenyo", "Baba Rahman",
  "Daniel Amartey", "Denis Odoi", "Elisha Owusu", "Iñaki Williams",
  "Jordan Ayew", "Joseph Wollacott", "Mohammed Kudus", "Osman Bukari",
  "Tariq Lamptey", "Thomas Partey",
  // Honduras
  "Alberth Elis", "Bryan Acosta", "Deiby Flores", "Denil Maldonado",
  "Jorge Álvarez", "Jonathan Rougier", "Luis López", "Rigoberto Rivas",
  "Romell Quioto",
  // Hungary
  "Ádám Lang", "Ádám Nagy", "Attila Szalai", "Callum Styles",
  "Dominik Szoboszlai", "Endre Botka", "Kevin Csoboth", "Martin Ádám",
  "Péter Gulácsi", "Roland Sallai", "Willi Orbán",
  // Indonesia
  "Ernando Ari", "Ivar Jenner", "Jordi Amat", "Marc Klok",
  "Marselino Ferdinan", "Nathan Tjoe-A-On", "Pratama Arhan",
  "Rafael Struick", "Ragnar Oratmangoen", "Rizky Ridho", "Sandy Walsh",
  // Iran
  "Ahmad Noorollahi", "Ali Gholizadeh", "Ali Karimi", "Alireza Beiranvand",
  "Allahyar Sayyadmanesh", "Hossein Hosseini", "Majid Hosseini",
  "Mehdi Taremi", "Milad Mohammadi", "Saeid Ezatolahi", "Sardar Azmoun",
  // Italy
  "Alessandro Bastoni", "Alex Meret", "Bryan Cristante", "Davide Frattesi",
  "Federico Chiesa", "Federico Dimarco", "Francesco Acerbi", "Giacomo Raspadori",
  "Gianluigi Donnarumma", "Giovanni Di Lorenzo", "Gianluca Scamacca",
  "Lorenzo Pellegrini", "Manuel Locatelli", "Mateo Retegui", "Nicolò Barella",
  "Nicolò Zaniolo", "Sandro Tonali", "Stephan El Shaarawy",
  // Ivory Coast
  "Badra Ali Sangaré", "Franck Kessié", "Ibrahim Sangaré", "Jean-Philippe Gbamin",
  "Jonathan Bamba", "Max Gradel", "Nicolas Pépé", "Oumar Diakité",
  "Sébastien Haller", "Serge Aurier", "Simon Deli", "Wilfried Singo",
  "Wilfried Zaha",
  // Japan
  "Ayase Ueda", "Daichi Kamada", "Daizen Maeda", "Hidemasa Morita",
  "Junya Ito", "Kaoru Mitoma", "Keito Nakamura", "Ko Itakura",
  "Kōsei Tategami", "Reo Hatate", "Ritsu Dōan", "Shōgo Taniguchi",
  "Shuichi Gonda", "Takefusa Kubo", "Takehiro Tomiyasu", "Takumi Minamino",
  "Wataru Endō", "Yukinari Sugawara", "Zion Suzuki",
  // Kenya
  "Arnold Origi", "Brian Otieno", "Erick Ouma", "Johanna Omollo",
  "Joash Onyango", "Joseph Okumu", "Kenneth Muguna", "Masud Juma",
  "Michael Olunga",
  // Mali
  "Amadou Haidara", "Boubacar Kouyaté", "El Bilal Touré", "Hamari Traoré",
  "Ibrahima Koné", "Ibrahim Mounkoro", "Lassana Coulibaly", "Mohamed Camara",
  "Moussa Djenepo", "Yves Bissouma",
  // Mexico
  "Alexis Vega", "Edson Álvarez", "Guillermo Ochoa", "Henry Martín",
  "Héctor Herrera", "Hirving Lozano", "Jesús Gallardo", "Johan Vásquez",
  "Jorge Sánchez", "Julián Araujo", "Luis Malagón", "Néstor Araujo",
  "Orbelin Pineda", "Raúl Jiménez", "Roberto Alvarado", "Santiago Giménez",
  "Uriel Antuna",
  // Morocco
  "Abdessamad Ezzalzouli", "Achraf Hakimi", "Ahmed Reda Tagnaouti",
  "Ayoub El Kaabi", "Azzedine Ounahi", "Hakim Ziyech", "Ilias Chair",
  "Jawad El Yamiq", "Nayef Aguerd", "Noussair Mazraoui", "Romain Saïss",
  "Selim Amallah", "Sofiane Boufal", "Sofyan Amrabat", "Yassine Bounou",
  "Youssef En-Nesyri",
  // Netherlands
  "Brian Brobbey", "Cody Gakpo", "Denzel Dumfries", "Donyell Malen",
  "Frenkie de Jong", "Jasper Cillessen", "Lutsharel Geertruida", "Marten de Roon",
  "Matthijs de Ligt", "Memphis Depay", "Nathan Aké", "Quinten Timber",
  "Remko Pasveer", "Ryan Gravenberch", "Stefan de Vrij", "Teun Koopmeiners",
  "Virgil van Dijk", "Wout Weghorst", "Xavi Simons",
  // New Zealand
  "Chris Wood", "Clayton Lewis", "Elijah Just", "Liberato Cacace",
  "Matthew Garbett", "Michael Boxall", "Myer Bevan", "Ryan Thomas",
  "Sarpreet Singh", "Stefan Marinović", "Tim Payne", "Tommy Smith",
  "Winston Reid",
  // Nigeria
  "Alex Iwobi", "Calvin Bassey", "Cyriel Dessers", "Emmanuel Dennis",
  "Francis Uzoho", "Joe Aribo", "Kelechi Iheanacho", "Leon Balogun",
  "Maduka Okoye", "Moses Simon", "Ola Aina", "Samuel Chukwueze",
  "Semi Ajayi", "Taiwo Awoniyi", "Victor Osimhen", "Wilfred Ndidi",
  "William Troost-Ekong",
  // Panama
  "Abdiel Arroyo", "Adalberto Carrasquilla", "Azmahar Ariano", "César Blackman",
  "Eric Davis", "Fidel Escobar", "Ismael Díaz", "Luis Mejía",
  "Rolando Blackburn", "Cecilio Waterman",
  // Paraguay
  "Ángel Romero", "Andrés Cubas", "Antony Silva", "Antonio Sanabria",
  "Fabián Balbuena", "Gustavo Gómez", "Mathías Villasanti", "Miguel Almirón",
  "Omar Alderete", "Richard Sánchez", "Santiago Arzamendia",
  // Peru
  "Alex Valera", "Alexander Callens", "André Carrillo", "Carlos Zambrano",
  "Christian Cueva", "Christofer Gonzáles", "Edison Flores", "Gianluca Lapadula",
  "Luis Advíncula", "Miguel Trauco", "Pedro Gallese", "Renato Tapia",
  "Yoshimar Yotún",
  // Portugal
  "Bernardo Silva", "Bruma", "Bruno Fernandes", "Cristiano Ronaldo",
  "Danilo Pereira", "Diogo Costa", "Diogo Jota", "Gonçalo Inácio",
  "Gonçalo Ramos", "João Cancelo", "João Félix", "Nuno Mendes",
  "Otávio", "Pedro Neto", "Rafael Leão", "Rafa Silva",
  "Rúben Dias", "Rúben Neves", "Rui Patrício", "Vitinha",
  // Qatar
  "Abdelkarim Hassan", "Akram Afif", "Almoez Ali", "Bassam Al-Rawi",
  "Hassan Al-Haydos", "Ismaeil Mohamad", "Karim Boudiaf", "Meshaal Barsham",
  "Mohammed Al-Bakri", "Mohammed Muntari", "Pedro Miguel",
  // Saudi Arabia
  "Abdullah Al-Hamdan", "Ali Al-Bulayhi", "Firas Al-Buraikan",
  "Hassan Al-Tambakti", "Mohammed Al-Owais", "Mohammed Kanno",
  "Salem Al-Dawsari", "Saleh Al-Shehri", "Sultan Al-Ghanam",
  // Senegal
  "Alfred Gomis", "Boulaye Dia", "Édouard Mendy", "Fodé Ballo-Touré",
  "Habib Diallo", "Idrissa Gueye", "Iliman Ndiaye", "Ismaila Sarr",
  "Kalidou Koulibaly", "Lamine Camara", "Nicolas Jackson", "Pape Abou Cissé",
  "Pape Matar Sarr", "Sadio Mané", "Youssouf Sabaly",
  // Serbia
  "Aleksandar Mitrović", "Andrija Živković", "Dušan Tadić", "Dušan Vlahović",
  "Filip Kostić", "Luka Jović", "Miloš Veljković", "Nemanja Gudelj",
  "Nikola Milenković", "Predrag Rajković", "Saša Lukić", "Sergej Milinković-Savić",
  "Strahinja Pavlović", "Vanja Milinković-Savić",
  // Slovenia
  "Adam Gnezda Čerin", "Andraž Šporar", "Benjamin Šeško", "Benjamin Verbič",
  "Erik Janža", "Jan Oblak", "Jon Gorenc Stanković", "Miha Blažič",
  "Miha Zajc", "Timi Max Elšnik", "Žan Celar",
  // South Africa
  "Bongani Zungu", "Bruce Bvuma", "Ethan Brooks", "Evidence Makgopa",
  "Lebo Mothiba", "Lyle Foster", "Percy Tau", "Reeve Frosler",
  "Ronwen Williams", "Rushine De Reuck", "Siyanda Xulu", "Themba Zwane",
  // South Korea
  "Cho Gue-sung", "Hwang Hee-chan", "Hwang In-beom", "Jo Hyeon-woo",
  "Kim Jin-su", "Kim Min-jae", "Kim Seung-gyu", "Kim Young-gwon",
  "Lee Kang-in", "Lee Jae-sung", "Oh Hyeon-gyu", "Son Heung-min",
  "Song Min-kyu",
  // Spain
  "Alejandro Balde", "Álvaro Morata", "Ansu Fati", "Aymeric Laporte",
  "Dani Carvajal", "Dani Olmo", "Dani Vivian", "David Raya",
  "Fabián Ruiz", "Ferran Torres", "Gavi", "Joselu",
  "Lamine Yamal", "Marc Cucurella", "Mikel Merino", "Mikel Oyarzabal",
  "Nico Williams", "Pau Cubarsí", "Pedri", "Robin Le Normand",
  "Rodrigo Hernández", "Unai Simón",
  // Switzerland
  "Breel Embolo", "Dan Ndoye", "Denis Zakaria", "Fabian Rieder",
  "Fabian Schär", "Granit Xhaka", "Gregor Kobel", "Manuel Akanji",
  "Michel Aebischer", "Noah Okafor", "Remo Freuler", "Ricardo Rodríguez",
  "Ruben Vargas", "Silvan Widmer", "Xherdan Shaqiri", "Yann Sommer",
  "Zeki Amdouni",
  // Trinidad and Tobago
  "Alvin Jones", "Andre Raymond", "Aubrey David", "Joevin Jones",
  "Judah Garcia", "Kevin Molino", "Levi Garcia", "Marvin Phillip",
  "Noah Powder", "Sheldon Bateau", "Triston Hodge",
  // Ukraine
  "Artem Dovbyk", "Georgiy Sudakov", "Heorhiy Bushchan", "Mykhailo Mudryk",
  "Mykola Matviienko", "Oleksandr Zinchenko", "Oleksandr Zubkov",
  "Roman Yaremchuk", "Ruslan Malinovskyi", "Taras Stepanenko",
  "Viktor Tsygankov", "Vitaliy Mykolenko", "Yukhym Konoplia",
  // United States
  "Antonee Robinson", "Brenden Aaronson", "Christian Pulisic",
  "Folarin Balogun", "Giovanni Reyna", "Joe Scally", "Jordan Morris",
  "Josh Sargent", "Matt Turner", "Miles Robinson", "Ricardo Pepi",
  "Sergino Dest", "Tim Weah", "Tyler Adams", "Weston McKennie",
  "Yunus Musah", "Zack Steffen",
  // Uruguay
  "Darwin Núñez", "Facundo Pellistri", "Federico Valverde", "Giorgian De Arrascaeta",
  "José María Giménez", "Mathías Olivera", "Maximiliano Gómez",
  "Nahitan Nández", "Nicolás De La Cruz", "Rodrigo Bentancur",
  "Ronald Araújo", "Sergio Rochet",
].sort();
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/ashkan/Code/worldcup26 && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

---

### Task 3: Create `PlayerAutocomplete` component

**Files:**
- Create: `src/components/ui/player-autocomplete.tsx`

- [ ] **Step 1: Create the component file**

Create `src/components/ui/player-autocomplete.tsx` with this content:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PlayerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  players: string[];
  placeholder?: string;
  id?: string;
  className?: string;
}

export default function PlayerAutocomplete({
  value,
  onChange,
  players,
  placeholder = "Player name…",
  id,
  className,
}: PlayerAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered =
    value.length > 0
      ? players
          .filter((p) => p.toLowerCase().includes(value.toLowerCase()))
          .slice(0, 8)
      : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => value.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="h-11"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-popover shadow-md">
          {filtered.map((player) => (
            <li key={player}>
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors",
                  value === player && "bg-primary/10 text-primary font-medium"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(player);
                  setOpen(false);
                }}
              >
                {player}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/ashkan/Code/worldcup26 && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

---

### Task 4: Update `scoring.ts`

**Files:**
- Modify: `src/lib/scoring.ts:12-19` (POINTS constant)
- Modify: `src/lib/scoring.ts:83-101` (calculateTournamentPoints)

- [ ] **Step 1: Add `tournament_top_assist` to POINTS**

In `src/lib/scoring.ts`, change:

```typescript
export const POINTS = {
  exact_score: 6,
  correct_winner_goal_diff: 4,
  correct_winner_only: 2,
  wrong: 0,
  tournament_champion: 15,
  tournament_top_scorer: 15,
} as const;
```

to:

```typescript
export const POINTS = {
  exact_score: 6,
  correct_winner_goal_diff: 4,
  correct_winner_only: 2,
  wrong: 0,
  tournament_champion: 15,
  tournament_top_scorer: 15,
  tournament_top_assist: 10,
} as const;
```

- [ ] **Step 2: Extend `calculateTournamentPoints`**

Change the function from:

```typescript
export function calculateTournamentPoints(
  prediction: { champion: string | null; topScorer: string | null },
  actual: { champion: string; topScorer: string }
): number {
  let points = 0;
  if (
    prediction.champion &&
    prediction.champion.toLowerCase() === actual.champion.toLowerCase()
  ) {
    points += POINTS.tournament_champion;
  }
  if (
    prediction.topScorer &&
    prediction.topScorer.toLowerCase() === actual.topScorer.toLowerCase()
  ) {
    points += POINTS.tournament_top_scorer;
  }
  return points;
}
```

to:

```typescript
export function calculateTournamentPoints(
  prediction: { champion: string | null; topScorer: string | null; topAssist: string | null },
  actual: { champion: string; topScorer: string; topAssist: string }
): number {
  let points = 0;
  if (
    prediction.champion &&
    prediction.champion.toLowerCase() === actual.champion.toLowerCase()
  ) {
    points += POINTS.tournament_champion;
  }
  if (
    prediction.topScorer &&
    prediction.topScorer.toLowerCase() === actual.topScorer.toLowerCase()
  ) {
    points += POINTS.tournament_top_scorer;
  }
  if (
    prediction.topAssist &&
    prediction.topAssist.toLowerCase() === actual.topAssist.toLowerCase()
  ) {
    points += POINTS.tournament_top_assist;
  }
  return points;
}
```

- [ ] **Step 3: Verify TypeScript (expect errors — callers not updated yet)**

```bash
cd /Users/ashkan/Code/worldcup26 && npx tsc --noEmit 2>&1 | head -30
```

Expected: TypeScript errors about `topAssist` missing from callers — that's correct, Tasks 5 and 6 fix them.

---

### Task 5: Update tournament API route

**Files:**
- Modify: `src/app/api/tournament/route.ts:51-57`

- [ ] **Step 1: Accept `topAssist` in PUT and include in upsert**

In `src/app/api/tournament/route.ts`, change:

```typescript
  const { champion, topScorer } = await req.json();

  const prediction = await prisma.tournamentPrediction.upsert({
    where: { userId_window: { userId: session.userId, window } },
    create: { userId: session.userId, window, champion, topScorer },
    update: { champion, topScorer },
  });
```

to:

```typescript
  const { champion, topScorer, topAssist } = await req.json();

  const prediction = await prisma.tournamentPrediction.upsert({
    where: { userId_window: { userId: session.userId, window } },
    create: { userId: session.userId, window, champion, topScorer, topAssist },
    update: { champion, topScorer, topAssist },
  });
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/ashkan/Code/worldcup26 && npx tsc --noEmit 2>&1 | head -20
```

Expected: errors only from the 5 `calculateTournamentPoints` callers (not from this file).

---

### Task 6: Update all `calculateTournamentPoints` callers

**Files:**
- Modify: `src/app/api/leaderboard/route.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/leaderboard/page.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/compare/[idA]/[idB]/page.tsx`

Each caller needs two changes:
1. Add `topAssist: true` to the Prisma `select` for `tournamentPredictions` (where a select exists)
2. Add `actualTopAssist` env var read and pass `topAssist` to `calculateTournamentPoints`

- [ ] **Step 1: Update `src/app/api/leaderboard/route.ts`**

Change the `tournamentPredictions` select:

```typescript
      tournamentPredictions: {
        select: { champion: true, topScorer: true, window: true },
      },
```

to:

```typescript
      tournamentPredictions: {
        select: { champion: true, topScorer: true, topAssist: true, window: true },
      },
```

Change:

```typescript
  const actualChampion = process.env.ACTUAL_CHAMPION ?? "";
  const actualTopScorer = process.env.ACTUAL_TOP_SCORER ?? "";
```

to:

```typescript
  const actualChampion = process.env.ACTUAL_CHAMPION ?? "";
  const actualTopScorer = process.env.ACTUAL_TOP_SCORER ?? "";
  const actualTopAssist = process.env.ACTUAL_TOP_ASSIST ?? "";
```

Change the `calculateTournamentPoints` call:

```typescript
          ? calculateTournamentPoints(latestTournament, {
              champion: actualChampion,
              topScorer: actualTopScorer,
            })
```

to:

```typescript
          ? calculateTournamentPoints(latestTournament, {
              champion: actualChampion,
              topScorer: actualTopScorer,
              topAssist: actualTopAssist,
            })
```

- [ ] **Step 2: Update `src/app/page.tsx`**

Change the `tournamentPredictions` select:

```typescript
      tournamentPredictions: {
        select: { champion: true, topScorer: true, window: true },
      },
```

to:

```typescript
      tournamentPredictions: {
        select: { champion: true, topScorer: true, topAssist: true, window: true },
      },
```

Change:

```typescript
  const actualChampion = process.env.ACTUAL_CHAMPION ?? "";
  const actualTopScorer = process.env.ACTUAL_TOP_SCORER ?? "";
```

to:

```typescript
  const actualChampion = process.env.ACTUAL_CHAMPION ?? "";
  const actualTopScorer = process.env.ACTUAL_TOP_SCORER ?? "";
  const actualTopAssist = process.env.ACTUAL_TOP_ASSIST ?? "";
```

Change the `calculateTournamentPoints` call:

```typescript
          ? calculateTournamentPoints(latestTournament, {
              champion: actualChampion,
              topScorer: actualTopScorer,
            })
```

to:

```typescript
          ? calculateTournamentPoints(latestTournament, {
              champion: actualChampion,
              topScorer: actualTopScorer,
              topAssist: actualTopAssist,
            })
```

- [ ] **Step 3: Update `src/app/leaderboard/page.tsx`**

Apply the same three changes as Step 2 (select, env var, function call). The select is at line 27, the env var at line 37, and the function call at lines 62–65.

Change:

```typescript
      tournamentPredictions: {
        select: { champion: true, topScorer: true, window: true },
      },
```

to:

```typescript
      tournamentPredictions: {
        select: { champion: true, topScorer: true, topAssist: true, window: true },
      },
```

Change:

```typescript
  const actualChampion = process.env.ACTUAL_CHAMPION ?? "";
  const actualTopScorer = process.env.ACTUAL_TOP_SCORER ?? "";
```

to:

```typescript
  const actualChampion = process.env.ACTUAL_CHAMPION ?? "";
  const actualTopScorer = process.env.ACTUAL_TOP_SCORER ?? "";
  const actualTopAssist = process.env.ACTUAL_TOP_ASSIST ?? "";
```

Change:

```typescript
          ? calculateTournamentPoints(latestTournament, {
              champion: actualChampion,
              topScorer: actualTopScorer,
            })
```

to:

```typescript
          ? calculateTournamentPoints(latestTournament, {
              champion: actualChampion,
              topScorer: actualTopScorer,
              topAssist: actualTopAssist,
            })
```

- [ ] **Step 4: Update `src/app/login/page.tsx`**

Change the `tournamentPredictions` select:

```typescript
        tournamentPredictions: {
          select: { champion: true, topScorer: true, window: true },
        },
```

to:

```typescript
        tournamentPredictions: {
          select: { champion: true, topScorer: true, topAssist: true, window: true },
        },
```

Change:

```typescript
    const actualChampion = process.env.ACTUAL_CHAMPION ?? "";
    const actualTopScorer = process.env.ACTUAL_TOP_SCORER ?? "";
```

to:

```typescript
    const actualChampion = process.env.ACTUAL_CHAMPION ?? "";
    const actualTopScorer = process.env.ACTUAL_TOP_SCORER ?? "";
    const actualTopAssist = process.env.ACTUAL_TOP_ASSIST ?? "";
```

Change the `calculateTournamentPoints` call:

```typescript
            ? calculateTournamentPoints(latest, { champion: actualChampion, topScorer: actualTopScorer })
```

to:

```typescript
            ? calculateTournamentPoints(latest, { champion: actualChampion, topScorer: actualTopScorer, topAssist: actualTopAssist })
```

- [ ] **Step 5: Update `src/app/compare/[idA]/[idB]/page.tsx`**

This file uses `tournamentPredictions: true` (no select filter), so the field is already included. Only the env var and function call need updating.

Change:

```typescript
  const actualTopScorer = process.env.ACTUAL_TOP_SCORER ?? "";
```

to:

```typescript
  const actualTopScorer = process.env.ACTUAL_TOP_SCORER ?? "";
  const actualTopAssist = process.env.ACTUAL_TOP_ASSIST ?? "";
```

Change the `calculateTournamentPoints` call — it's at lines 103–106, passing `champion` and `topScorer`. Add `topAssist`:

```typescript
    return calculateTournamentPoints(latest, {
      champion: actualChampion,
      topScorer: actualTopScorer,
      topAssist: actualTopAssist,
    });
```

- [ ] **Step 6: Verify TypeScript — expect clean**

```bash
cd /Users/ashkan/Code/worldcup26 && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

---

### Task 7: Update `TournamentForm.tsx`

**Files:**
- Modify: `src/components/tournament/TournamentForm.tsx`

- [ ] **Step 1: Rewrite `TournamentForm.tsx`**

Replace the entire file with:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { WC2026_TEAMS, TEAM_TO_FLAG_CODE, WC2026_PLAYERS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CheckCircle2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import PlayerAutocomplete from "@/components/ui/player-autocomplete";
import type { TournamentPrediction } from "@prisma/client";
import * as CountryFlags from "country-flag-icons/react/3x2";

type FlagKey = keyof typeof CountryFlags;

function TeamFlag({ team }: { team: string }) {
  const code = TEAM_TO_FLAG_CODE[team] as FlagKey | undefined;
  const FlagComponent = code
    ? (CountryFlags[code] as React.ComponentType<{ className?: string }> | undefined)
    : undefined;

  return (
    <span className="w-5 h-[15px] flex-shrink-0 rounded-sm overflow-hidden shadow-sm inline-block">
      {FlagComponent ? (
        <FlagComponent className="w-full h-full" />
      ) : (
        <span className="w-full h-full bg-muted flex items-center justify-center text-[7px] font-bold text-muted-foreground">
          {team.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

interface TournamentFormProps {
  window: "INITIAL" | "POST_GROUP";
  locked: boolean;
  initialPrediction: TournamentPrediction | null;
  postGroupPrediction: TournamentPrediction | null;
}

function TeamOption({
  team,
  selected,
  onSelect,
}: {
  team: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-left transition-colors",
        selected
          ? "bg-primary/10 border border-primary text-primary"
          : "hover:bg-muted border border-transparent"
      )}
    >
      <TeamFlag team={team} />
      <span className="text-sm">{team}</span>
      {selected && <CheckCircle2 className="h-4 w-4 ml-auto flex-shrink-0" />}
    </button>
  );
}

export default function TournamentForm({
  window,
  locked,
  initialPrediction,
  postGroupPrediction,
}: TournamentFormProps) {
  const activePrediction =
    window === "POST_GROUP" ? postGroupPrediction : initialPrediction;

  const [champion, setChampion] = useState(activePrediction?.champion ?? "");
  const [topScorer, setTopScorer] = useState(activePrediction?.topScorer ?? "");
  const [topAssist, setTopAssist] = useState(activePrediction?.topAssist ?? "");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const filteredTeams = WC2026_TEAMS.filter((t) =>
    t.toLowerCase().includes(search.toLowerCase())
  );

  async function save() {
    setSaving(true);
    const res = await fetch("/api/tournament", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ champion, topScorer, topAssist }),
    });
    setSaving(false);

    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Failed to save");
      return;
    }

    setSaved(true);
    toast.success("Tournament prediction saved!");
    setTimeout(() => setSaved(false), 3000);
  }

  if (locked) {
    return (
      <div className="space-y-4">
        <Section title="World Cup Champion">
          <div className="flex items-center gap-2 text-sm">
            {activePrediction?.champion ? (
              <>
                <TeamFlag team={activePrediction.champion} />
                <span className="font-medium">{activePrediction.champion}</span>
              </>
            ) : (
              <span className="text-muted-foreground">No prediction made</span>
            )}
          </div>
        </Section>
        <Section title="Golden Boot (Top Scorer)">
          <span className="text-sm font-medium">
            {activePrediction?.topScorer || (
              <span className="text-muted-foreground">No prediction made</span>
            )}
          </span>
        </Section>
        <Section title="Top Assists">
          <span className="text-sm font-medium">
            {activePrediction?.topAssist || (
              <span className="text-muted-foreground">No prediction made</span>
            )}
          </span>
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Prior window summary */}
      {window === "POST_GROUP" && initialPrediction && (
        <div className="bg-muted/50 rounded-xl p-3 text-sm space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Your initial prediction
          </p>
          <p>Champion: {initialPrediction.champion ?? "–"}</p>
          <p>Top scorer: {initialPrediction.topScorer ?? "–"}</p>
          <p>Top assists: {initialPrediction.topAssist ?? "–"}</p>
        </div>
      )}

      {/* Champion picker */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">World Cup Champion</Label>
        {champion && (
          <div className="flex items-center gap-2 text-sm text-primary font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>{champion}</span>
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team…"
            className="pl-9"
          />
        </div>
        <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border">
          {filteredTeams.map((team) => (
            <TeamOption
              key={team}
              team={team}
              selected={champion === team}
              onSelect={() => setChampion(team)}
            />
          ))}
        </div>
      </div>

      {/* Golden Boot */}
      <div className="space-y-2">
        <Label htmlFor="topScorer" className="text-base font-semibold">
          Golden Boot (Top Scorer)
        </Label>
        <PlayerAutocomplete
          id="topScorer"
          value={topScorer}
          onChange={setTopScorer}
          players={WC2026_PLAYERS}
          placeholder="Player name…"
        />
      </div>

      {/* Top Assists */}
      <div className="space-y-2">
        <Label htmlFor="topAssist" className="text-base font-semibold">
          Top Assists
        </Label>
        <PlayerAutocomplete
          id="topAssist"
          value={topAssist}
          onChange={setTopAssist}
          players={WC2026_PLAYERS}
          placeholder="Player name…"
        />
      </div>

      <Button
        onClick={save}
        disabled={saving || !champion}
        className="w-full h-12 text-base"
      >
        {saving ? "Saving…" : saved ? "Saved!" : "Save prediction"}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center">
        15 pts for correct champion · 15 pts for correct top scorer · 10 pts for correct top assists
        {window === "INITIAL"
          ? " · Can update after group stage"
          : " · Locks when knockouts begin"}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/ashkan/Code/worldcup26 && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

---

### Task 8: Show `topAssist` in player profile page

**Files:**
- Modify: `src/app/players/[id]/page.tsx:110-113`

- [ ] **Step 1: Add `topAssist` row to the tournament prediction card**

In `src/app/players/[id]/page.tsx`, find this block:

```tsx
              <div className="flex items-center justify-between text-sm py-1.5">
                <span className="text-muted-foreground">Top scorer</span>
                <span className="font-semibold">{latestTournament.topScorer ?? "–"}</span>
              </div>
```

Replace it with:

```tsx
              <div className="flex items-center justify-between text-sm py-1.5 border-b border-border">
                <span className="text-muted-foreground">Top scorer</span>
                <span className="font-semibold">{latestTournament.topScorer ?? "–"}</span>
              </div>
              <div className="flex items-center justify-between text-sm py-1.5">
                <span className="text-muted-foreground">Top assists</span>
                <span className="font-semibold">{latestTournament.topAssist ?? "–"}</span>
              </div>
```

- [ ] **Step 2: Final TypeScript + build check**

```bash
cd /Users/ashkan/Code/worldcup26 && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

```bash
cd /Users/ashkan/Code/worldcup26 && npm run build 2>&1 | tail -20
```

Expected: build completes with no errors.

---

### Deployment note

After deploying, set the `ACTUAL_TOP_ASSIST` environment variable (Railway → Variables) to the player name once the tournament top assists leader is known. Pattern matches `ACTUAL_TOP_SCORER`.
