/**
 * Job Centre page - central hub for staff recruitment
 * Features candidate browsing, filtering, and hiring functionality with authentic ethnic names
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { UserPlus, Briefcase, AlertCircle, Info, Euro } from 'lucide-react';
import StaffSkillsOverview from '../components/staff/StaffSkillsOverview';

/**
 * Candidate interface
 * @description Represents a job candidate available for hire
 */
interface Candidate {
  id: string;
  name: string;
  role: 'driver' | 'mechanic' | 'manager' | 'dispatcher';
  experience: number;
  skills: string[];
  expectedSalary: number;
  location: string;
  availability: 'immediate' | '1week' | '2weeks' | '3weeks';
  nationality: string;
  rating: number;
  completedJobs: number;
  joinedDate: string;
  gender: 'male' | 'female';
}

/**
 * JobCenter component
 * @description Renders the job centre UI: filters, candidate list and hiring actions.
 */
const JobCenter: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, createCompany } = useGame();
  const [selectedRole, setSelectedRole] = useState<'all' | 'driver' | 'mechanic' | 'manager' | 'dispatcher'>('all');
  const [minSalary, setMinSalary] = useState<number>(0);
  const [maxSalary, setMaxSalary] = useState<number>(10000);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [hiredCandidateIds, setHiredCandidateIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const company = gameState.company;

  /**
   * getAvailabilityDelay
   * @description Returns delay in days for a candidate based on availability string.
   * Supports: immediate, 1week, 2weeks, 3weeks (fallbacks to 0).
   * @param availability availability token
   */
  const getAvailabilityDelay = (availability: string): number => {
    switch (availability) {
      case 'immediate':
        return 0;
      case '1week':
        return 7;
      case '2weeks':
        return 14;
      case '3weeks':
        return 21;
      default:
        return 0;
    }
  };

  /**
   * getHiringFeePercent
   * @description Determine hiring fee percent depending on notice period.
   * Rules:
   * - Available Now -> 70%
   * - 1 week -> 50%
   * - 2 weeks -> 35%
   * - 3 weeks -> 20%
   * Default fallback: 50%
   * @param availability availability token
   */
  const getHiringFeePercent = (availability: string): number => {
    switch (availability) {
      case 'immediate':
        return 70;
      case '1week':
        return 50;
      case '2weeks':
        return 35;
      case '3weeks':
        return 20;
      default:
        return 50;
    }
  };

  /**
   * calculateSalary
   * @description Fixed salary calculation based on experience and skills count
   */
  const calculateSalary = (experience: number, skillCount: number): number => {
    const baseSalary = 1500;
    const experienceBonus = Math.floor((experience - 20) * 22); // 20-90% exp gives $0-$1540
    const skillsBonus = skillCount * 250; // $0-$750 for 0-3 skills

    const totalSalary = baseSalary + experienceBonus + skillsBonus;

    // Ensure within €2000-€4000 range
    return Math.max(2000, Math.min(4000, totalSalary));
  };

  /**
   * generateEthnicName
   * @description Small helper to produce fallback names when needed
   */
 // COMPREHENSIVE ETHNIC NAME DATABASE
  const ethnicNames = {
    'Germany': {
      male: ['Hans', 'Klaus', 'Dieter', 'Wolfgang', 'Jürgen', 'Stefan', 'Michael', 'Thomas', 'Frank', 'Andreas', 'Manfred', 'Peter', 'Günter', 'Horst', 'Joachim', 'Rainer', 'Helmut', 'Karl', 'Rolf', 'Uwe'],
      female: ['Petra', 'Sabine', 'Monika', 'Ursula', 'Susanne', 'Andrea', 'Christina', 'Stefanie', 'Karin', 'Elke', 'Brigitte', 'Gabriele', 'Heike', 'Martina', 'Angelika', 'Renate', 'Silvia', 'Beate', 'Julia', 'Simone'],
      last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann']
    },
    'France': {
      male: ['Jean', 'Pierre', 'Michel', 'Philippe', 'Alain', 'Nicolas', 'Christophe', 'Pascal', 'Laurent', 'Patrick', 'Sébastien', 'Olivier', 'Frédéric', 'David', 'Étienne', 'François', 'Vincent', 'Robert', 'Julien', 'Stéphane'],
      female: ['Marie', 'Isabelle', 'Nathalie', 'Valérie', 'Sylvie', 'Catherine', 'Céline', 'Martine', 'Sophie', 'Nathalie', 'Laurence', 'Monique', 'Christine', 'Sandrine', 'Annie', 'Patricia', 'Claudine', 'Dominique', 'Brigitte', 'Josiane'],
      last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier']
    },
    'Italy': {
      male: ['Mario', 'Giuseppe', 'Antonio', 'Giovanni', 'Paolo', 'Francesco', 'Alessandro', 'Roberto', 'Marco', 'Luca', 'Andrea', 'Stefano', 'Matteo', 'Lorenzo', 'Davide', 'Riccardo', 'Federico', 'Simone', 'Giulio', 'Valerio'],
      female: ['Sofia', 'Giulia', 'Martina', 'Chiara', 'Francesca', 'Alessia', 'Valentina', 'Elisa', 'Sara', 'Giorgia', 'Beatrice', 'Greta', 'Aurora', 'Alice', 'Emma', 'Camilla', 'Giusy', 'Ludovica', 'Vittoria', 'Rebecca'],
      last: ['Rossi', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Costa', 'Giordano', 'Mancini', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri']
    },
    'Spain': {
      male: ['José', 'Juan', 'Antonio', 'Francisco', 'Manuel', 'Javier', 'Carlos', 'Miguel', 'Ángel', 'Jesús', 'Pedro', 'Luis', 'Rafael', 'Alberto', 'Santiago', 'Andrés', 'Diego', 'Roberto', 'Ramón', 'Fernando'],
      female: ['María', 'Ana', 'Carmen', 'Isabel', 'Margarita', 'Teresa', 'Rosa', 'Pilar', 'Francisca', 'Laura', 'Cristina', 'Elena', 'Patricia', 'Marta', 'Sofía', 'Alicia', 'Silvia', 'Nuria', 'Nieves', 'Beatriz'],
      last: ['García', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Martín', 'Gómez', 'Jiménez', 'Muñoz', 'Alonso', 'Álvarez', 'Moreno', 'Muñoz', 'Díaz', 'Ruiz', 'Moreno', 'Jiménez']
    },
    'Poland': {
      male: ['Piotr', 'Krzysztof', 'Andrzej', 'Tomasz', 'Jan', 'Marcin', 'Marek', 'Michał', 'Paweł', 'Stanisław', 'Grzegorz', 'Józef', 'Łukasz', 'Adam', 'Zbigniew', 'Jerzy', 'Rafał', 'Dariusz', 'Henryk', 'Robert'],
      female: ['Anna', 'Maria', 'Katarzyna', 'Małgorzata', 'Agnieszka', 'Ewa', 'Joanna', 'Monika', 'Katarina', 'Barbara', 'Elżbieta', 'Justyna', 'Beata', 'Danuta', 'Irena', 'Kamila', 'Natalia', 'Gabriela', 'Dorota', 'Jadwiga'],
      last: ['Nowak', 'Kowalski', 'Wiśniewski', 'Wojcik', 'Kowalczyk', 'Kamiński', 'Lewandowski', 'Zielinski', 'Szymanski', 'Wozniak', 'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur', 'Wojciechowski', 'Kwiatkowski', 'Krawczyk', 'Kaczmarek', 'Piotrowski', 'Grabowski']
    },
    'Netherlands': {
      male: ['Jan', 'Willem', 'Pieter', 'Hendrik', 'Johannes', 'Jacob', 'Cornelis', 'Abraham', 'Dirk', 'Michael', 'Peter', 'Thomas', 'Daniel', 'Richard', 'Robert', 'Martin', 'Steven', 'Frank', 'Mark', 'Henk'],
      female: ['Anna', 'Petronella', 'Maria', 'Elizabeth', 'Wilhelmina', 'Cornelia', 'Catharina', 'Adriana', 'Margaretha', 'Gerardina', 'Johanna', 'Neeltje', 'Maria', 'Geertruida', 'Lambertje', 'Willemina', 'Annetje', 'Aaltje', 'Marrigje', 'Grietje'],
      last: ['De Jong', 'Jansen', 'De Vries', 'Van den Berg', 'Van Dijk', 'Bakker', 'Visser', 'Smit', 'Meijer', 'De Boer', 'Mulder', 'De Groot', 'Bos', 'Vos', 'Peters', 'Hendriks', 'Van Leeuwen', 'Huisman', 'Kok', 'Schouten']
    },
    'Belgium': {
      male: ['Jean', 'Pierre', 'Philippe', 'Michel', 'André', 'Louis', 'Jacques', 'Bernard', 'Patrick', 'Daniel', 'Claude', 'Alain', 'Robert', 'Pierre', 'Jean-Claude', 'Michel', 'André', 'Philippe', 'Jean-Louis', 'Pierre-Yves'],
      female: ['Marie', 'Christine', 'Anne', 'Isabelle', 'Catherine', 'Sylvie', 'Brigitte', 'Françoise', 'Nathalie', 'Martine', 'Micheline', 'Claudine', 'Jeanne', 'Louise', 'Marguerite', 'Élisabeth', 'Julie', 'Caroline', 'Sophie', 'Patricia'],
      last: ['Peeters', 'Janssens', 'Maes', 'Jacobs', 'Mertens', 'Wouters', 'Verschoor', 'Leroy', 'Thomas', 'Lambert', 'Dupont', 'Dubois', 'Dumont', 'Cools', 'Vandamme', 'Vermeulen', 'Vandenberg', 'Claes', 'Smeets', 'Rousseau']
    },
    'Portugal': {
      male: ['João', 'José', 'António', 'Manuel', 'Pedro', 'Carlos', 'Luís', 'Jorge', 'Rui', 'Paulo', 'Miguel', 'Francisco', 'Tiago', 'André', 'Rodrigo', 'Bruno', 'Ricardo', 'Hugo', 'Sérgio', 'Nuno'],
      female: ['Maria', 'Ana', 'Isabel', 'Catarina', 'Sofia', 'Laura', 'Inês', 'Mariana', 'Leonor', 'Clara', 'Beatriz', 'Matilde', 'Alice', 'Carolina', 'Madalena', 'Rita', 'Francisca', 'Sara', 'Lara', 'Margarida'],
      last: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Costa', 'Oliveira', 'Martins', 'Rodrigues', 'Gomes', 'Almeida', 'Pinto', 'Nogueira', 'Carvalho', 'Teixeira', 'Marques', 'Fonseca', 'Azevedo', 'Dias', 'Lopes', 'Barbosa']
    },
    'Greece': {
      male: ['Giorgos', 'Nikolaos', 'Ioannis', 'Konstantinos', 'Dimitris', 'Panagiotis', 'Vasileios', 'Athanasios', 'Christos', 'Emmanouil', 'Michail', 'Spyridon', 'Andreas', 'Sotiris', 'Stavros', 'Theodoros', 'Iosif', 'Charalampos', 'Gregorios', 'Evangelos'],
      female: ['Maria', 'Eleni', 'Katerina', 'Sofia', 'Georgia', 'Vasiliki', 'Angeliki', 'Dimitra', 'Konstantina', 'Panagiota', 'Aikaterini', 'Ioanna', 'Zaharoula', 'Paraskevi', 'Eirini', 'Kalliopi', 'Christina', 'Niki', 'Despoina', 'Lamprini'],
      last: ['Papadopoulos', 'Papadakis', 'Georgiou', 'Nikolaou', 'Papas', 'Katsaros', 'Christodoulou', 'Ioannou', 'Constantinou', 'Karagiannis', 'Vasilakis', 'Dimitriou', 'Koutras', 'Kostas', 'Metaxas', 'Kalogeras', 'Alexiou', 'Skouras', 'Stamatakis', 'Karakostas']
    },
    'Sweden': {
      male: ['Erik', 'Lars', 'Johan', 'Nils', 'Anders', 'Per', 'Gunnar', 'Sture', 'Mats', 'Kjell', 'Leif', 'Ove', 'Bo', 'Åke', 'Göran', 'Bengt', 'Ulf', 'Lennart', 'Rolf', 'Dan'],
      female: ['Anna', 'Maria', 'Karin', 'Ingrid', 'Margareta', 'Eva', 'Astrid', 'Britt', 'Marianne', 'Christina', 'Ulla', 'Birgitta', 'Elisabeth', 'Kerstin', 'Gunilla', 'Annika', 'Catherine', 'Susanne', 'Sofia', 'Emma'],
      last: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson', 'Pettersson', 'Jönsson', 'Lindberg', 'Lindgren', 'Mattsson', 'Söderberg', 'Bergström', 'Bergqvist', 'Nyström', 'Axelsson']
    },
    'Hungary': {
      male: ['Péter', 'László', 'István', 'József', 'Gábor', 'Zoltán', 'Ferenc', 'Attila', 'András', 'Balázs', 'Károly', 'Tibor', 'Miklós', 'Tamás', 'Zsolt', 'Csaba', 'György', 'Dániel', 'Márton', 'Roland'],
      female: ['Anna', 'Katalin', 'Mária', 'Éva', 'Judit', 'Zsófia', 'Dóra', 'Anita', 'Klaudia', 'Andrea', 'Krisztina', 'Beáta', 'Enikő', 'Timea', 'Rita', 'Réka', 'Lilla', 'Nikolett', 'Viktória', 'Henrietta'],
      last: ['Nagy', 'Kovács', 'Szabó', 'Tóth', 'Varga', 'Horváth', 'Kiss', 'Molnár', 'Németh', 'Farkas', 'Balogh', 'Lakatos', 'Mészáros', 'Ősi', 'Király', 'Takács', 'Juhász', 'Varga', 'Bogdán', 'Fazekas']
    },
     'Armenia': {
    male: ['Arman', 'Vardan', 'Narek', 'David', 'Artur', 'Gevorg', 'Tigran', 'Andranik', 'Hayk', 'Ashot', 'Sargis', 'Vahan', 'Karen', 'Levon', 'Vigen', 'Armen', 'Hovhannes', 'Vahe', 'Grigor', 'Samvel'],
    female: ['Anahit', 'Anna', 'Mariam', 'Narine', 'Siranush', 'Lusine', 'Arpine', 'Hasmik', 'Gayane', 'Elena', 'Meline', 'Tatevik', 'Hripsime', 'Karine', 'Seda', 'Varduhi', 'Shushan', 'Armine', 'Marie', 'Nona'],
    last: ['Petrosyan', 'Harutyunyan', 'Stepanyan', 'Mkrtchyan', 'Sargsyan', 'Khachatryan', 'Grigoryan', 'Vardanyan', 'Alexanyan', 'Ghukasyan', 'Adamyan', 'Karapetyan', 'Hakobyan', 'Kocharyan', 'Mkhitaryan', 'Hovhannisyan', 'Avetisyan', 'Gabrielyan', 'Danielyan', 'Zeynalyan']
  },
     'Cyprus': {
    male: ['Andreas', 'Nicholas', 'Constantinos', 'Michalis', 'Christos', 'Georgios', 'Antonis', 'Marios', 'Panayiotis', 'Stavros', 'Demetris', 'Petros', 'Marinos', 'Kyriakos', 'Theodoros', 'Socrates', 'Soter', 'Sotiris', 'Vasilis', 'Savvas'],
    female: ['Maria', 'Eleni', 'Sofia', 'Anna', 'Andrianna', 'Eirini', 'Katerina', 'Christina', 'Despina', 'Marina', 'Eirini', 'Constantina', 'Stella', 'Rita', 'Alexandra', 'Eugenia', 'Lydia', 'Polina', 'Georgia', 'Martha'],
    last: ['Christodoulou', 'Georgiou', 'Michael', 'Ioannou', 'Nicolaou', 'Hadji', 'Stephanou', 'Demetriou', 'Koutras', 'Pavlou', 'Andreou', 'Kyris', 'Panayi', 'Soteriou', 'Petrou', 'Christophorou', 'Xenophontos', 'Tsiakkas', 'Efstathiou', 'Kyriakou']
  }, 
      'Israel': {
    male: ['David', 'Moshe', 'Yossi', 'Avi', 'Itay', 'Eyal', 'Omer', 'Noam', 'Yonatan', 'Ariel', 'Shlomo', 'Yehuda', 'Hanan', 'Yoav', 'Eitan', 'Uri', 'Daniel', 'Asaf', 'Gal', 'Ilan'],
    female: ['Miriam', 'Sarah', 'Avigail', 'Yael', 'Noa', 'Rivka', 'Hannah', 'Maya', 'Michal', 'Tamar', 'Dorit', 'Orly', 'Efrat', 'Hila', 'Lior', 'Neta', 'Roni', 'Dana', 'Shira', 'Adi'],
    last: ['Cohen', 'Levi', 'Mizrahi', 'Peretz', 'Biton', 'Shimoni', 'Klein', 'Ben-David', 'Levi', 'Goldberg', 'Azoulay', 'Kaplan', 'Shapira', 'Barak', 'Baron', 'Ben-Ami', 'Eliav', 'Yaron', 'Ben-Arie', 'Shavit']
  },
    'Slovakia': {
    male: ['Peter', 'Martin', 'Jozef', 'Marek', 'Miroslav', 'Juraj', 'Pavel', 'Ivan', 'Ladislav', 'Tomas', 'Stanislav', 'Andrej', 'Lukas', 'Michal', 'Roman', 'Rastislav', 'Filip', 'Matej', 'Rudolf', 'Vladimir'],
    female: ['Maria', 'Anna', 'Kristina', 'Jana', 'Monika', 'Petra', 'Martina', 'Ivana', 'Lenka', 'Katarina', 'Zuzana', 'Veronika', 'Lucia', 'Eva', 'Simona', 'Marta', 'Alena', 'Dagmar', 'Natalia', 'Gabriela'],
    last: ['Novak', 'Horvat', 'Kovac', 'Varga', 'Tomas', 'Miklos', 'Molnar', 'Svec', 'Kral', 'Balaz', 'Urban', 'Cerny', 'Bartos', 'Farkaš', 'Kovacik', 'Prochazka', 'Sikora', 'Polak', 'Kocian', 'Dostál']
  },
    
    'Romania': {
    male: ['Ion', 'Gheorghe', 'Vasile', 'Nicolae', 'Florin', 'Mihai', 'Dan', 'Andrei', 'Cristian', 'Gabriel', 'Alexandru', 'Marian', 'Adrian', 'Stefan', 'Catalin', 'Razvan', 'Ionut', 'Bogdan', 'Laurentiu', 'Victor'],
    female: ['Maria', 'Elena', 'Ioana', 'Ana', 'Gabriela', 'Cristina', 'Monica', 'Camelia', 'Adina', 'Andreea', 'Mihaela', 'Raluca', 'Laura', 'Simona', 'Diana', 'Georgiana', 'Lidia', 'Oana', 'Denisa', 'Irina'],
    last: ['Popescu', 'Ionescu', 'Popa', 'Dumitru', 'Stan', 'Radu', 'Matei', 'Marin', 'Stoica', 'Iliescu', 'Niculae', 'Munteanu', 'Raduca', 'Moraru', 'Tudor', 'Constantinescu', 'Ciobanu', 'Dobrin', 'Georgescu', 'Serban']
  },

  'Bulgaria': {
    male: ['Georgi', 'Ivan', 'Dimitar', 'Petar', 'Nikolay', 'Stefan', 'Yordan', 'Kiril', 'Vladimir', 'Mihail', 'Hristo', 'Plamen', 'Tsvetan', 'Rosen', 'Vasil', 'Boyan', 'Simeon', 'Radostin', 'Martin', 'Lubomir'],
    female: ['Maria', 'Ivanka', 'Petya', 'Elena', 'Yana', 'Violeta', 'Desislava', 'Mina', 'Anelia', 'Stela', 'Diana', 'Nadezhda', 'Silvia', 'Tanya', 'Kristina', 'Yuliana', 'Zornitsa', 'Rositsa', 'Mariya', 'Gergana'],
    last: ['Ivanov', 'Georgiev', 'Dimitrov', 'Petrov', 'Nikolov', 'Todorov', 'Stoianov', 'Kolev', 'Popov', 'Marinov', 'Nenkov', 'Yordanov', 'Kostov', 'Mitev', 'Angelov', 'Minev', 'Pavlov', 'Rusev', 'Hristov', 'Karakachanov']
  },

  'Croatia': {
    male: ['Ivan', 'Marko', 'Nikola', 'Stjepan', 'Josip', 'Ante', 'Dario', 'Petar', 'Mate', 'Tomislav', 'Luka', 'Denis', 'Davor', 'Marin', 'Goran', 'Karlo', 'Hrvoje', 'Miroslav', 'Duje', 'Zoran'],
    female: ['Marija', 'Ana', 'Ivana', 'Maja', 'Katarina', 'Martina', 'Marina', 'Ivona', 'Mirjana', 'Petra', 'Sandra', 'Lucija', 'Tea', 'Lana', 'Silvija', 'Diana', 'Tihana', 'Nina', 'Ines', 'Jelena'],
    last: ['Horvat', 'Kovač', 'Babić', 'Marić', 'Jurić', 'Novak', 'Marković', 'Bakarić', 'Prkačin', 'Kovačević', 'Šarić', 'Tomislav', 'Vuković', 'Radić', 'Kralj', 'Grgić', 'Matić', 'Pavlović', 'Božić', 'Ćosić']
  },

  'Serbia': {
    male: ['Marko', 'Nikola', 'Milan', 'Dragan', 'Petar', 'Stefan', 'Aleksandar', 'Nemanja', 'Zoran', 'Vladimir', 'Slobodan', 'Miroslav', 'Ilija', 'Goran', 'Dejan', 'Bogdan', 'Milos', 'Darko', 'Djordje', 'Branko'],
    female: ['Jelena', 'Marija', 'Milica', 'Sandra', 'Ana', 'Ivana', 'Dragana', 'Sanja', 'Tanja', 'Maja', 'Biljana', 'Katarina', 'Jovana', 'Natalija', 'Nada', 'Vesna', 'Snežana', 'Đurđina', 'Teodora', 'Sofija'],
    last: ['Jovanović', 'Nikolić', 'Petrović', 'Marković', 'Popović', 'Đorđević', 'Stojanović', 'Milanović', 'Kovačević', 'Janković', 'Lukić', 'Savić', 'Matić', 'Radić', 'Ivić', 'Ristić', 'Tomić', 'Vuković', 'Đukić', 'Simić']
  },

  'Ukraine': {
    male: ['Oleksandr', 'Andriy', 'Serhiy', 'Vladimir', 'Vasyl', 'Yuriy', 'Mykola', 'Volodymyr', 'Oleksiy', 'Denys', 'Pavlo', 'Oleh', 'Bohdan', 'Roman', 'Taras', 'Ihor', 'Ivan', 'Anatoliy', 'Vyacheslav', 'Marko'],
    female: ['Olena', 'Oksana', 'Natalia', 'Svitlana', 'Iryna', 'Tatiana', 'Lyudmyla', 'Anastasia', 'Maria', 'Kateryna', 'Olha', 'Nadiya', 'Inna', 'Valentyna', 'Yulia', 'Larysa', 'Nina', 'Alla', 'Galina', 'Viktoriya'],
    last: ['Shevchenko', 'Petrenko', 'Kovalenko', 'Boyko', 'Tkachenko', 'Kovalchuk', 'Melnyk', 'Bondarenko', 'Marchenko', 'Hrytsenko', 'Romanenko', 'Kravchenko', 'Moroz', 'Lysenko', 'Yakovlev', 'Zinchenko', 'Chernenko', 'Ivanov', 'Ponomarenko', 'Kucherenko']
  },
    'Albania': {
  male: ['Arben', 'Blerim', 'Dritan', 'Erion', 'Flamur', 'Gentian', 'Ilir', 'Klodian', 'Luan', 'Skender', 'Valon', 'Besnik', 'Ardit', 'Fatos', 'Shkelzen', 'Gramoz', 'Agim', 'Mentor', 'Artan', 'Redon'],
  female: ['Arta', 'Blerta', 'Drita', 'Elira', 'Fatmira', 'Gentiana', 'Iliriana', 'Lule', 'Mirela', 'Teuta', 'Valbona', 'Anila', 'Albana', 'Aurela', 'Suela', 'Elda', 'Arlinda', 'Brunilda', 'Ermira', 'Jonida'],
  last: ['Hoxha', 'Shehu', 'Dervishi', 'Krasniqi', 'Gashi', 'Leka', 'Kola', 'Marku', 'Basha', 'Rama', 'Meta', 'Koci', 'Duka', 'Muça', 'Toska', 'Kamberi', 'Beqiri', 'Dida', 'Kryeziu', 'Zeneli']
},

'Austria': {
  male: ['Johann', 'Franz', 'Josef', 'Wolfgang', 'Thomas', 'Michael', 'Andreas', 'Stefan', 'Peter', 'Markus', 'Christian', 'Martin', 'Karl', 'Georg', 'Lukas', 'Florian', 'Alexander', 'Manfred', 'Herbert', 'Heinz'],
  female: ['Maria', 'Anna', 'Elisabeth', 'Sabine', 'Petra', 'Andrea', 'Karin', 'Barbara', 'Ingrid', 'Christina', 'Julia', 'Katharina', 'Birgit', 'Monika', 'Susanne', 'Martina', 'Ursula', 'Brigitte', 'Margarete', 'Simone'],
  last: ['Gruber', 'Huber', 'Bauer', 'Wagner', 'Müller', 'Pichler', 'Steiner', 'Moser', 'Mayer', 'Hofer', 'Leitner', 'Berger', 'Fischer', 'Schmidt', 'Eder', 'Winkler', 'Schneider', 'Reiter', 'Lang', 'Schmid']
},

'Belarus': {
  male: ['Alexander', 'Sergei', 'Viktor', 'Igor', 'Yuri', 'Oleg', 'Dmitry', 'Andrei', 'Vladimir', 'Pavel', 'Mikhail', 'Roman', 'Anton', 'Evgeny', 'Nikolai', 'Leonid', 'Artyom', 'Valery', 'Gennady', 'Stanislav'],
  female: ['Olga', 'Natalia', 'Svetlana', 'Elena', 'Marina', 'Irina', 'Tatiana', 'Anna', 'Yulia', 'Daria', 'Kristina', 'Valentina', 'Veronika', 'Ekaterina', 'Alina', 'Galina', 'Polina', 'Nadezhda', 'Ludmila', 'Oksana'],
  last: ['Ivanov', 'Kuznetsov', 'Sidorov', 'Kravchenko', 'Bondar', 'Petrov', 'Smirnov', 'Kovalchuk', 'Morozov', 'Novikov', 'Zaitsev', 'Sobolev', 'Karpov', 'Tarasov', 'Belyakov', 'Goncharov', 'Lebedev', 'Orlov', 'Klimov', 'Melnik']
},

'Bosnia and Herzegovina': {
  male: ['Amir', 'Haris', 'Adnan', 'Emir', 'Nedim', 'Mirza', 'Dino', 'Darko', 'Stefan', 'Marko', 'Milan', 'Aleksandar', 'Selmir', 'Elvir', 'Tarik', 'Dejan', 'Branko', 'Boško', 'Nenad', 'Vedad'],
  female: ['Amela', 'Selma', 'Aida', 'Emina', 'Azra', 'Jasmina', 'Sabina', 'Lejla', 'Maja', 'Ana', 'Jelena', 'Sanja', 'Ivana', 'Milica', 'Tijana', 'Dragana', 'Anida', 'Belma', 'Lamija', 'Dijana'],
  last: ['Hadžic', 'Hodzic', 'Besic', 'Kovačević', 'Petrović', 'Jovanović', 'Ivić', 'Marković', 'Sarić', 'Halilović', 'Mehmedović', 'Omerović', 'Delić', 'Begović', 'Vuković', 'Babić', 'Zorić', 'Stojanović', 'Obradović', 'Ramić']
},

'Czech Republic': {
  male: ['Jan', 'Petr', 'Josef', 'Martin', 'Jaroslav', 'Tomáš', 'Miroslav', 'Karel', 'Lukáš', 'Jakub', 'Václav', 'David', 'Ondřej', 'Jiří', 'Radek', 'Filip', 'Daniel', 'Marek', 'Aleš', 'Roman'],
  female: ['Marie', 'Anna', 'Jana', 'Eva', 'Lenka', 'Kateřina', 'Lucie', 'Petra', 'Hana', 'Martina', 'Veronika', 'Kristýna', 'Barbora', 'Markéta', 'Monika', 'Alena', 'Zuzana', 'Tereza', 'Helena', 'Dana'],
  last: ['Novák', 'Svoboda', 'Novotný', 'Dvořák', 'Černý', 'Procházka', 'Kučera', 'Veselý', 'Horák', 'Němec', 'Marek', 'Pokorný', 'Pospíšil', 'Šimek', 'Kříž', 'Fiala', 'Bartoš', 'Beneš', 'Král', 'Jelínek']
},

'Denmark': {
  male: ['Lars', 'Jens', 'Peter', 'Hans', 'Niels', 'Morten', 'Thomas', 'Søren', 'Christian', 'Henrik', 'Anders', 'Rasmus', 'Kasper', 'Mikkel', 'Emil', 'Frederik', 'Martin', 'Michael', 'Jesper', 'Jacob'],
  female: ['Anne', 'Maria', 'Kirsten', 'Hanne', 'Lene', 'Birgitte', 'Camilla', 'Louise', 'Mette', 'Sofie', 'Nanna', 'Ida', 'Emma', 'Sara', 'Julie', 'Rikke', 'Tina', 'Charlotte', 'Pernille', 'Susanne'],
  last: ['Jensen', 'Nielsen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen', 'Sørensen', 'Rasmussen', 'Jørgensen', 'Petersen', 'Madsen', 'Kristensen', 'Olsen', 'Thomsen', 'Christiansen', 'Poulsen', 'Johansen', 'Knudsen', 'Mortensen']
},

'Estonia': {
  male: ['Karl', 'Martin', 'Markus', 'Rasmus', 'Tanel', 'Taavi', 'Rein', 'Jaan', 'Mart', 'Peeter', 'Ott', 'Indrek', 'Priit', 'Andres', 'Siim', 'Kristjan', 'Mikk', 'Sander', 'Tõnis', 'Erik'],
  female: ['Anna', 'Maria', 'Liis', 'Kadri', 'Kärt', 'Kristi', 'Merle', 'Evelin', 'Pille', 'Kai', 'Marika', 'Helena', 'Maarja', 'Karin', 'Triin', 'Keili', 'Eliise', 'Laura', 'Leena', 'Hanna'],
  last: ['Tamm', 'Saar', 'Sepp', 'Kask', 'Rebane', 'Ilves', 'Kukk', 'Mägi', 'Ots', 'Pärn', 'Koppel', 'Parts', 'Karu', 'Roos', 'Kivirähk', 'Laas', 'Kaskinen', 'Lepp', 'Vaher', 'Valk']
},

'Finland': {
  male: ['Matti', 'Jussi', 'Kari', 'Timo', 'Mika', 'Juha', 'Antti', 'Tapio', 'Markus', 'Petri', 'Pekka', 'Ville', 'Sami', 'Harri', 'Eero', 'Ari', 'Lauri', 'Olli', 'Jari', 'Heikki'],
  female: ['Anna', 'Maria', 'Liisa', 'Anu', 'Sanna', 'Kaisa', 'Laura', 'Heidi', 'Helena', 'Paivi', 'Katja', 'Pirjo', 'Susanna', 'Maija', 'Noora', 'Elina', 'Riikka', 'Tiina', 'Johanna', 'Marja'],
  last: ['Korhonen', 'Virtanen', 'Mäkinen', 'Nieminen', 'Mäkelä', 'Hämäläinen', 'Laine', 'Heikkinen', 'Koskinen', 'Järvinen', 'Lehtonen', 'Heinonen', 'Salminen', 'Niemi', 'Aalto', 'Rantanen', 'Kinnunen', 'Turunen', 'Laitinen', 'Saarinen']
},

'Ireland': {
  male: ['Sean', 'Patrick', 'Conor', 'Liam', 'Declan', 'Ciaran', 'Shane', 'Brendan', 'Michael', 'Aidan', 'Kevin', 'Eoin', 'Cathal', 'Ronan', 'Padraig', 'Finbar', 'Darragh', 'Niall', 'Fergus', 'Tadhg'],
  female: ['Mary', 'Aoife', 'Saoirse', 'Maeve', 'Niamh', 'Grainne', 'Siobhan', 'Aisling', 'Eileen', 'Orla', 'Fiona', 'Ciara', 'Bridget', 'Erin', 'Roisin', 'Deirdre', 'Mairead', 'Una', 'Kathleen', 'Moira'],
  last: ['Murphy', 'Kelly', 'O\'Sullivan', 'Walsh', 'Smith', 'O\'Brien', 'Byrne', 'Ryan', 'O\'Connor', 'Doyle', 'McCarthy', 'Gallagher', 'O\'Neill', 'Kennedy', 'Lynch', 'Murray', 'Quinn', 'Moore', 'McLoughlin', 'Duffy']
},

'Kosovo': {
  male: ['Ardian', 'Lirim', 'Faton', 'Arben', 'Valdrin', 'Blerim', 'Mentor', 'Agon', 'Kujtim', 'Artan', 'Alban', 'Fisnik', 'Skender', 'Besnik', 'Ilir', 'Jeton', 'Dardan', 'Shpend', 'Visar', 'Blendi'],
  female: ['Arta', 'Vjosa', 'Luljeta', 'Flutura', 'Albulena', 'Gentiana', 'Teuta', 'Valbona', 'Fatmire', 'Mimoza', 'Mirjeta', 'Blerta', 'Donjeta', 'Hana', 'Rinorë', 'Dhurata', 'Arlinda', 'Kaltrina', 'Vesa', 'Era'],
  last: ['Gashi', 'Krasniqi', 'Berisha', 'Hoxha', 'Shala', 'Rexhepi', 'Bytyqi', 'Beqiri', 'Kelmendi', 'Dervishi', 'Aliu', 'Kastrati', 'Nimani', 'Ramadani', 'Hasani', 'Ismaili', 'Morina', 'Selimi', 'Qorri', 'Zeqiri']
},

'Latvia': {
  male: ['Jānis', 'Andris', 'Edgars', 'Kaspars', 'Mārtiņš', 'Aleksandrs', 'Raimonds', 'Roberts', 'Valdis', 'Ivars', 'Pēteris', 'Rihards', 'Artūrs', 'Kristaps', 'Dainis', 'Gatis', 'Aigars', 'Raivis', 'Arnis', 'Mareks'],
  female: ['Ilze', 'Liga', 'Inese', 'Lauma', 'Amanda', 'Zane', 'Kristine', 'Elina', 'Agnese', 'Baiba', 'Dace', 'Inga', 'Mara', 'Evija', 'Santa', 'Una', 'Ruta', 'Lāsma', 'Sabīne', 'Vita'],
  last: ['Kalniņš', 'Ozoliņš', 'Bērziņš', 'Jansons', 'Liepiņš', 'Krauze', 'Mežs', 'Vilsons', 'Lūsis', 'Balodis', 'Eglītis', 'Dombrovskis', 'Gailis', 'Kāpītis', 'Riekstiņš', 'Siliņš', 'Āboliņš', 'Pētersons', 'Tīrelis', 'Krūmiņš']
},

'Lithuania': {
  male: ['Jonas', 'Vytautas', 'Mindaugas', 'Dainius', 'Tomas', 'Mantas', 'Saulius', 'Gintaras', 'Andrius', 'Remigijus', 'Karolis', 'Lukas', 'Paulius', 'Arvydas', 'Vilius', 'Ernestas', 'Justas', 'Rokas', 'Martynas', 'Evaldas'],
  female: ['Asta', 'Rasa', 'Jolanta', 'Daiva', 'Dalia', 'Lina', 'Kristina', 'Egle', 'Rima', 'Indre', 'Monika', 'Viktorija', 'Aiste', 'Gintare', 'Agnė', 'Ieva', 'Laima', 'Gabija', 'Greta', 'Karina'],
  last: ['Kazlauskas', 'Petrauskas', 'Jonaitis', 'Paulauskas', 'Ivanauskas', 'Balčiūnas', 'Stankevičius', 'Kučinskas', 'Budrys', 'Urbonas', 'Žukauskas', 'Mockus', 'Rimkus', 'Girdauskas', 'Kavaliauskas', 'Navickas', 'Bendžius', 'Kairys', 'Mažeika', 'Pocius']
},

'Luxembourg': {
  male: ['Jean', 'Marc', 'Claude', 'Patrick', 'Paul', 'Alain', 'Serge', 'Tom', 'Luc', 'Guy', 'Georges', 'Nicolas', 'François', 'René', 'André', 'Michel', 'Steve', 'Eric', 'Gilles', 'Antoine'],
  female: ['Marie', 'Anne', 'Monique', 'Sophie', 'Carole', 'Isabelle', 'Christine', 'Nathalie', 'Nicole', 'Catherine', 'Julie', 'Sarah', 'Laura', 'Mélanie', 'Chantal', 'Martine', 'Patricia', 'Lisa', 'Sandra', 'Claudine'],
  last: ['Schmit', 'Muller', 'Weber', 'Hoffmann', 'Wagner', 'Kirsch', 'Schneider', 'Lentz', 'Kremer', 'Becker', 'Kopp', 'Reuter', 'Adam', 'Bauer', 'Berg', 'Klein', 'Kaiser', 'Heinen', 'Fischer', 'Schroeder']
},

'Moldova': {
  male: ['Ion', 'Vasile', 'Gheorghe', 'Sergiu', 'Andrei', 'Victor', 'Nicolae', 'Petru', 'Mihai', 'Dumitru', 'Cornel', 'Iurie', 'Valeriu', 'Oleg', 'Denis', 'Eugen', 'Igor', 'Roman', 'Pavel', 'Anatol'],
  female: ['Maria', 'Ana', 'Elena', 'Tatiana', 'Olga', 'Natalia', 'Veronica', 'Svetlana', 'Irina', 'Doina', 'Cristina', 'Valentina', 'Silvia', 'Ludmila', 'Marina', 'Alina', 'Diana', 'Gabriela', 'Galina', 'Nadejda'],
  last: ['Popa', 'Rusu', 'Ursu', 'Ceban', 'Ciobanu', 'Munteanu', 'Rotaru', 'Croitoru', 'Moraru', 'Balan', 'Nicolae', 'Toma', 'Bejan', 'Istrati', 'Olaru', 'Sandu', 'Botezatu', 'Turcanu', 'Vasilache', 'Rosca']
},

'Montenegro': {
  male: ['Marko', 'Luka', 'Petar', 'Nikola', 'Filip', 'Stefan', 'Milan', 'Aleksandar', 'Vladimir', 'Bojan', 'Savo', 'Zoran', 'Predrag', 'Milos', 'Rade', 'Goran', 'Miroslav', 'Danilo', 'Nenad', 'Dejan'],
  female: ['Ana', 'Milica', 'Marija', 'Ivana', 'Jovana', 'Dragana', 'Katarina', 'Teodora', 'Tijana', 'Bojana', 'Danijela', 'Jelena', 'Kristina', 'Sara', 'Andjela', 'Tatjana', 'Lidija', 'Sanja', 'Nina', 'Mira'],
  last: ['Popović', 'Jovanović', 'Marković', 'Nikolić', 'Đukanović', 'Stanković', 'Radović', 'Perović', 'Savić', 'Milić', 'Vuković', 'Babić', 'Božović', 'Pavićević', 'Kovačević', 'Mitrović', 'Ivanović', 'Petrović', 'Knežević', 'Đurišić']
},

'North Macedonia': {
  male: ['Aleksandar', 'Stefan', 'Filip', 'Goran', 'Nikola', 'Darko', 'Vladimir', 'Bojan', 'Kiril', 'Toni', 'Petar', 'Dragan', 'Stojan', 'Dejan', 'Branko', 'Sasho', 'Hristo', 'Ilija', 'Boban', 'Mihail'],
  female: ['Ana', 'Marija', 'Elena', 'Simona', 'Teodora', 'Ivana', 'Sara', 'Jana', 'Katerina', 'Martina', 'Snežana', 'Biljana', 'Vesna', 'Lidija', 'Marina', 'Maja', 'Dragana', 'Silvana', 'Kristina', 'Tatjana'],
  last: ['Stojanovski', 'Petrovski', 'Jovanovski', 'Nikolovski', 'Ristovski', 'Georgievski', 'Trajkovski', 'Nacevski', 'Markovski', 'Ilievski', 'Mitrevski', 'Hristov', 'Kostov', 'Bojkovski', 'Angelovski', 'Pavlovski', 'Velkovski', 'Petkovski', 'Arsov', 'Vasilevski']
},

'Norway': {
  male: ['Lars', 'Per', 'Kjell', 'Ole', 'Hans', 'Anders', 'Morten', 'Thomas', 'Kristian', 'Jon', 'Eirik', 'Håkon', 'Magnus', 'Sverre', 'Tor', 'Knut', 'Bjørn', 'Stein', 'Vegard', 'Henrik'],
  female: ['Anne', 'Ingrid', 'Liv', 'Kristin', 'Solveig', 'Marit', 'Silje', 'Kari', 'Hilde', 'Camilla', 'Line', 'Grete', 'Siri', 'Mona', 'Ragnhild', 'Eli', 'Ida', 'Nina', 'Tove', 'Maria'],
  last: ['Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen', 'Jensen', 'Karlsen', 'Johnsen', 'Pettersen', 'Eriksen', 'Berg', 'Haugen', 'Andreassen', 'Dahl', 'Jørgensen', 'Moen', 'Solberg']
},

'Slovenia': {
  male: ['Marko', 'Luka', 'Matej', 'Bojan', 'Janez', 'Tomaž', 'Andrej', 'Miha', 'Peter', 'Aleš', 'Simon', 'Rok', 'Jure', 'Igor', 'Primož', 'Zoran', 'Milan', 'Goran', 'Dejan', 'Boris'],
  female: ['Ana', 'Marija', 'Maja', 'Petra', 'Nina', 'Tina', 'Mateja', 'Katarina', 'Sara', 'Jana', 'Eva', 'Barbara', 'Alenka', 'Urska', 'Tanja', 'Mojca', 'Špela', 'Kristina', 'Sabina', 'Darja'],
  last: ['Novak', 'Horvat', 'Krajnc', 'Zupančič', 'Kovačič', 'Mlakar', 'Vidmar', 'Golob', 'Kralj', 'Turk', 'Božič', 'Koren', 'Potočnik', 'Košir', 'Mahkovec', 'Lenarčič', 'Oblak', 'Bizjak', 'Lavrič', 'Zakrajšek']
},

'Switzerland': {
  male: ['Hans', 'Peter', 'Markus', 'Thomas', 'Luca', 'Matthias', 'Stefan', 'Daniel', 'Christian', 'Martin', 'Reto', 'Fabian', 'Kurt', 'Bruno', 'Heinz', 'Pascal', 'Nicolas', 'Beat', 'Roger', 'Jonas'],
  female: ['Maria', 'Anna', 'Ursula', 'Monika', 'Sandra', 'Claudia', 'Martina', 'Petra', 'Daniela', 'Elisabeth', 'Simone', 'Nicole', 'Sabine', 'Barbara', 'Andrea', 'Carla', 'Sarah', 'Bettina', 'Helena', 'Laura'],
  last: ['Müller', 'Meier', 'Schmid', 'Keller', 'Weber', 'Fischer', 'Huber', 'Moser', 'Baumann', 'Zimmermann', 'Frei', 'Sieber', 'Graf', 'Roth', 'Wyss', 'Steiner', 'Hofer', 'Lehmann', 'Studer', 'Ammann']
},

'United Kingdom': {
  male: ['James', 'John', 'William', 'Thomas', 'George', 'David', 'Michael', 'Robert', 'Richard', 'Joseph', 'Daniel', 'Edward', 'Henry', 'Charles', 'Benjamin', 'Luke', 'Oliver', 'Harry', 'Samuel', 'Jack'],
  female: ['Mary', 'Elizabeth', 'Sarah', 'Emma', 'Charlotte', 'Grace', 'Olivia', 'Emily', 'Lucy', 'Sophie', 'Jessica', 'Rebecca', 'Hannah', 'Amelia', 'Megan', 'Alice', 'Chloe', 'Katie', 'Eleanor', 'Georgia'],
  last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Evans', 'Thomas', 'Roberts', 'Walker', 'Wright', 'Thompson', 'White', 'Edwards', 'Green', 'Hall', 'Wood', 'Hughes']
},
    'Bahrain': {
  male: ['Ahmed','Mohamed','Ali','Hamad','Khalid','Faisal','Hassan','Abdullah','Omar','Majed','Saeed','Nasser','Salman','Issa','Jassim','Yousif','Adnan','Talal','Rashid','Mubarak'],
  female: ['Fatima','Aisha','Maryam','Huda','Mona','Amal','Noura','Rana','Lama','Samira','Layla','Nadia','Sara','Reem','Dalia','Hanin','Bushra','Yasmin','Dina','Rasha'],
  last: ['Al Khalifa','Al Doseri','Al Kuwari','Al Nuaimi','Al Sayed','Al Mansoori','Al Qassimi','Al Jaber','Al Hassan','Al Tamimi','Al Farsi','Al Ameri','Al Zayani','Al Hajri','Al Sabti','Al Ajmi','Al Mahdi','Al Rashed','Al Saleh','Al Yusuf']
},

'Georgia': {
  male: ['Giorgi','Levan','Irakli','Luka','Nika','Tornike','Zurab','Davit','Mamuka','Sandro','Koba','Vakhtang','Nikoloz','Shota','Beka','Goga','Tamar','Guram','Alexandre','Mikheil'],
  female: ['Nino','Tamar','Ana','Salome','Keto','Eka','Mariam','Lika','Sopo','Irina','Lana','Ia','Maia','Mzia','Keti','Nana','Natia','Mako','Tea','Dali'],
  last: ['Beridze','Giorgadze','Kapanadze','Gelashvili','Gogoladze','Sikharulidze','Chikovani','Kiknadze','Japaridze','Imedadze','Kutateladze','Lomidze','Tsertsvadze','Bregvadze','Khutsishvili','Meladze','Kobakhidze','Gugushvili','Tsereteli','Dvalishvili']
},

'Iran': {
  male: ['Reza','Ali','Mohsen','Farid','Arash','Hassan','Navid','Sina','Kian','Masoud','Bahram','Pouya','Nima','Saeed','Kamran','Behnam','Ramin','Omid','Peyman','Vahid'],
  female: ['Sara','Maryam','Fatemeh','Niloofar','Elham','Arezoo','Leila','Shirin','Yasmin','Hanieh','Samira','Tina','Mahsa','Nazanin','Roya','Taraneh','Ariana','Narges','Sadaf','Setareh'],
  last: ['Mohammadi','Hosseini','Ahmadi','Kazemi','Rahimi','Karimi','Ebrahimi','Rezaei','Sharifi','Farhadi','Soltani','Bahmani','Mousavi','Ghasemi','Akbari','Nouri','Esmaeili','Jafari','Fazeli','Samadi']
},

'Iraq': {
  male: ['Ahmed','Ali','Hassan','Mustafa','Omar','Yasin','Haidar','Abbas','Kareem','Mahmoud','Fahd','Basim','Samir','Tariq','Saad','Adel','Rami','Ziad','Munir','Suhail'],
  female: ['Fatima','Zainab','Alaa','Rana','Hiba','Dalia','Noor','Mariam','Dalal','Yasmin','Layla','Amani','Hanan','Sarah','Iman','Abeer','Shaima','Reem','Nisreen','Sana'],
  last: ['Al Hashimi','Al Janabi','Al Sudani','Al Tamimi','Al Obaidi','Al Shammari','Al Bayati','Al Jubouri','Al Mousawi','Al Rubaie','Al Dulaimi','Al Maliki','Al Yassiri','Al Shahmani','Al Khafaji','Al Samarrai','Al Ansari','Al Fadhli','Al Jaberi','Al Salman']
},

'Jordan': {
  male: ['Omar','Ahmad','Khaled','Yousef','Ibrahim','Faris','Hazem','Mahmoud','Saeed','Ammar','Walid','Rami','Zaid','Nabil','Jamal','Adnan','Basil','Samir','Majed','Nasser'],
  female: ['Aisha','Leen','Aya','Farah','Maya','Reem','Lama','Dana','Dina','Nour','Laila','Rahaf','Hala','Sahar','Rasha','Yasmin','Tala','Hanin','Bushra','Sama'],
  last: ['Al Masri','Al Fayez','Al Rawashdeh','Al Khatib','Al Omari','Al Zoubi','Al Qudah','Al Momani','Al Majali','Al Hariri','Al Taweel','Al Saifi','Al Abbadi','Al Kassasbeh','Al Jbour','Al Aqrabawi','Al Zayed','Al Adwan','Al Haj','Al Sarhan']
},

'Lebanon': {
  male: ['Karim','Joseph','Elie','Toni','Fadi','Rami','George','Nadim','Samir','Marwan','Ziad','Antoine','Michel','Jad','Roger','Ralph','Rashed','Bilal','Nabil','Ali'],
  female: ['Maya','Mira','Rita','Christina','Lama','Sara','Layal','Elissa','Nour','Rana','Joumana','Dina','Carla','Nadine','Mira','Joelle','Reem','Nadine','Maya','Hala'],
  last: ['Khoury','Haddad','Salman','Sayegh','Nasr','Fakhoury','Awad','Saad','Shaker','Iskandar','Saleh','Barakat','Habib','Ghanem','Farhat','Baz','Azar','Nassar','Sabbagh','Hajj']
},

'Oman': {
  male: ['Sultan','Ahmed','Ali','Hamad','Khalfan','Fahad','Nasser','Salim','Majid','Mubarak','Saeed','Talal','Hilal','Rashid','Yaqoub','Marwan','Khalid','Adnan','Said','Juma'],
  female: ['Aisha','Fatma','Maha','Siham','Mona','Latifa','Shamsa','Reem','Sara','Salma','Amani','Nawal','Huda','Rania','Dalal','Marwa','Lama','Dunia','Sana','Yasmin'],
  last: ['Al Harthy','Al Farsi','Al Balushi','Al Rashdi','Al Hinai','Al Ghafri','Al Jabri','Al Abri','Al Riyami','Al Lawati','Al Shibli','Al Amri','Al Kathiri','Al Maskari','Al Nabhani','Al Mahrouqi','Al Habsi','Al Saadi','Al Shamsi','Al Wahibi']
},

'Syria': {
  male: ['Ahmad','Khaled','Yazan','Omar','Rami','Mahmoud','Hassan','Firas','Tareq','Samir','Nadim','Bilal','Adnan','Salem','Mazen','Nabil','Yousef','Ziad','Samer','Ammar'],
  female: ['Sara','Hala','Reem','Maya','Lina','Dina','Amina','Rania','Yasmin','Basma','Dalal','Iman','Nour','Sahar','Hiba','Mona','Dalia','Ruwaida','Shaima','Sama'],
  last: ['Al Hassan','Al Saleh','Al Sheikh','Al Hamwi','Al Jundi','Al Masri','Al Qadi','Al Rifai','Al Darwish','Al Hamdan','Al Saad','Al Khoury','Al Barhoum','Al Jalabi','Al Ramadan','Al Sawan','Al Haddad','Al Suleiman','Al Youssef','Al Aziz']
},

'Turkey': {
  male: ['Mehmet','Ahmet','Mustafa','Ali','Hasan','Murat','Ibrahim','Yusuf','Kemal','Fatih','Can','Emre','Serkan','Okan','Hakan','Tuncay','Yasin','Erdem','Burak','Onur'],
  female: ['Fatma','Elif','Merve','Aylin','Bahar','Deniz','Selin','Esra','Derya','Leyla','Seda','Yasemin','Nazli','Aysun','Emine','Gul','Nisa','Ceyda','Ipek','Asli'],
  last: ['Yilmaz','Kaya','Demir','Celik','Arslan','Sahin','Ozturk','Aydin','Koc','Kurt','Avci','Aksoy','Erdogan','Kara','Yildiz','Tas','Polat','Aslan','Kilic','Ucar']
},

'Yemen': {
  male: ['Ali','Mohamed','Ahmed','Hassan','Ibrahim','Mahmoud','Omar','Saeed','Khaled','Fahd','Nasser','Yahya','Tareq','Adnan','Abdullah','Sultan','Rashid','Basim','Jamal','Munir'],
  female: ['Fatima','Amina','Huda','Sahar','Nadia','Arwa','Samira','Iman','Rana','Reem','Mariam','Laila','Hanan','Dalia','Lubna','Sana','Aisha','Raha','Bushra','Salma'],
  last: ['Al Hakimi','Al Hamzi','Al Amri','Al Riyashi','Al Sabri','Al Sharabi','Al Sudani','Al Masri','Al Rimi','Al Awad','Al Jabri','Al Yafai','Al Ahdal','Al Wazir','Al Qadi','Al Barakani','Al Mutawakkil','Al Arashi','Al Banna','Al Maktari']
},
    'Kazakhstan': {
  male: ['Nursultan','Dias','Ayan','Samat','Murat','Aslan','Yerlan','Serik','Bekzat','Timur','Aibek','Alikhan','Nurlan','Dana','Rustem','Daniyar','Kanat','Arman','Rauan','Damir'],
  female: ['Aigerim','Dana','Zhanna','Altynai','Ainur','Madina','Kamila','Karina','Aruzhan','Malika','Aya','Zarina','Samal','Dilara','Saule','Nazerke','Mira','Asel','Gulnar','Alua'],
  last: ['Nazarbayev','Zhaksylyk','Tulegenov','Suleimenov','Akhmetov','Saparov','Kozhamkulov','Amanov','Bakhytov','Karimov','Mukanov','Yesimov','Serikbayev','Rakhimov','Asylbekov','Nurpeisov','Tasmagambetov','Kassymov','Seitov','Bekturov']
},

'Kyrgyzstan': {
  male: ['Bakyt','Azamat','Nursultan','Almaz','Tilek','Tologon','Arsen','Ermek','Danil','Kubat','Rinat','Ayan','Bek','Nurlan','Iskender','Samat','Meder','Aibek','Timur','Ruslan'],
  female: ['Aizada','Meerim','Ainura','Aizada','Asel','Gulbara','Madina','Aygul','Nazira','Kalina','Amina','Ainagul','Samara','Malika','Dana','Zamira','Rayana','Alina','Saliya','Altynai'],
  last: ['Abdykalykov','Sadykov','Mamatov','Erkinbaev','Osmonov','Kadyrov','Saparov','Amanbaev','Toktogulov','Asanov','Bekbolotov','Imanaliev','Turgunov','Boranbayev','Nurmatov','Myrzabekov','Ismailov','Kenzhebaev','Tashmatov','Zholdoshov']
},

'Tajikistan': {
  male: ['Farid','Rustam','Karim','Iskandar','Jamshid','Bahrom','Rasul','Sharif','Firdavs','Suhrob','Daler','Nodir','Khusraw','Azim','Nemat','Habib','Mahmud','Said','Tahir','Amir'],
  female: ['Zarina','Malika','Madina','Nigina','Dilrabo','Hafiza','Nasiba','Mehriniso','Nilufar','Shahlo','Surayo','Sabrina','Royana','Mavjuda','Asia','Samira','Lola','Marhabo','Saida','Shahzoda'],
  last: ['Rahmon','Sharipov','Karimov','Saidov','Azizov','Nazarov','Ismatov','Safarov','Yusupov','Hakimov','Mirzoev','Fayzov','Rahimov','Ergashev','Abdullayev','Khaydarov','Gaffarov','Sharipov','Hamidov','Ashurov']
},

'Turkmenistan': {
  male: ['Serdar','Murat','Atamyrat','Begench','Bayram','Oraz','Gurban','Annaguly','Dovran','Sapar','Agahan','Danish','Nurzhan','Annanazar','Dovlet','Yhlas','Rahman','Mansur','Alty','Kerim'],
  female: ['Aygul','Aynur','Maral','Ayan','Madina','Nurana','Jahan','Selbi','Gulnar','Aigul','Maya','Aida','Leyla','Lala','Amina','Ariana','Darya','Karina','Samira','Aizada'],
  last: ['Berdymukhammedov','Gurbanov','Myradov','Ovezov','Saparov','Atayev','Dovletov','Geldiyev','Rahmanov','Nuryyev','Hojayev','Annaklychev','Kurbanov','Yazmuradov','Tachmammedov','Bekmuradov','Khalilov','Karayev','Amanlyyev','Tirkiyev']
},

'Uzbekistan': {
  male: ['Bekzod','Jahongir','Akmal','Otabek','Farrukh','Rustam','Sherzod','Anvar','Shavkat','Ulugbek','Botir','Islom','Husan','Sardor','Jamshid','Aziz','Ravshan','Timur','Davron','Komil'],
  female: ['Malika','Nargiza','Nigora','Gulnora','Diyora','Shahnoza','Madina','Gulbahor','Feruza','Dilbar','Nilufar','Rayhon','Asal','Manzura','Kamola','Lola','Ziyoda','Saida','Aziza','Shahina'],
  last: ['Karimov','Tashkentov','Saidov','Nazarov','Hasanov','Sharipov','Yuldashev','Rahimov','Juraev','Normatov','Rakhmatov','Azizov','Tursunov','Khudoyberdiev','Soliev','Boboev','Rasulov','Ismoilov','Khamidov','Abdullaev']
},
'Afghanistan': {
  male: ['Ahmad','Mohammad','Omid','Khalid','Farid','Sami','Javid','Rashid','Naveed','Rahim','Sayed','Hassan','Aziz','Bilal','Yasin','Karim','Basir','Fawad','Haroon','Sardar'],
  female: ['Fatima','Maryam','Sahar','Laila','Roya','Zahra','Nadia','Farzana','Niloofar','Wida','Meena','Hana','Yasmin','Rana','Shabnam','Hina','Halima','Samira','Sana','Diba'],
  last: ['Ahmadi','Rahimi','Karimi','Siddiqi','Safi','Waziri','Khorasani','Azimi','Hashimi','Hafizi','Mosawi','Jafari','Qaderi','Fazli','Sharifi','Noori','Amini','Kazemi','Farooqi','Osmani']
},

'Bangladesh': {
  male: ['Rahim','Karim','Jamal','Sohel','Hasan','Arif','Sajid','Tanvir','Mahmud','Nayeem','Faisal','Rashed','Rafiq','Imran','Shakil','Amin','Mashud','Tariq','Omar','Rubel'],
  female: ['Fatema','Mariya','Sharmin','Sumaiya','Rima','Mahia','Jannat','Nusrat','Roksana','Salma','Ayesha','Nadia','Tania','Farhana','Nargis','Rubi','Sharmeen','Anika','Urmi','Puja'],
  last: ['Islam','Rahman','Hossain','Ahmed','Karim','Mia','Ali','Hasan','Sheikh','Biswas','Khan','Azad','Siddique','Mondal','Talukdar','Chowdhury','Gazi','Sarker','Rana','Bashar']
},

'India': {
  male: ['Arjun','Raj','Amit','Vijay','Rohan','Rahul','Sanjay','Vikram','Karan','Deepak','Harish','Manish','Ravi','Suresh','Aakash','Anil','Prakash','Naveen','Shiv','Kiran'],
  female: ['Priya','Anita','Kavita','Sonia','Asha','Rekha','Pooja','Neha','Divya','Anjali','Meera','Sunita','Ritu','Kiran','Radhika','Shreya','Nisha','Lakshmi','Sneha','Preeti'],
  last: ['Patel','Sharma','Khan','Singh','Gupta','Reddy','Nair','Iyer','Das','Mehta','Chopra','Kapoor','Bose','Sarkar','Yadav','Rathore','Joshi','Verma','Bhat','Sinha']
},

'Pakistan': {
  male: ['Ali','Ahmed','Hassan','Usman','Hamza','Bilal','Imran','Salman','Rizwan','Ahsan','Arif','Junaid','Shahbaz','Waqas','Noman','Zain','Fahad','Kashif','Asim','Saad'],
  female: ['Ayesha','Fatima','Sana','Iqra','Hina','Zara','Nimra','Maria','Areeba','Mehwish','Khadija','Anum','Hira','Komal','Amna','Dua','Mina','Sara','Mahnoor','Sumaira'],
  last: ['Khan','Malik','Sheikh','Chaudhry','Hussain','Shah','Qureshi','Siddiqui','Farooq','Aslam','Rana','Bhatti','Javed','Butt','Dar','Nawaz','Abbasi','Yousaf','Ansari','Kiani']
},

'Sri Lanka': {
  male: ['Kamal','Nuwan','Dinuk','Shehan','Rohan','Saman','Charith','Ashan','Kasun','Prabath','Malith','Roshan','Lakshan','Isuru','Kavindu','Dilan','Rasika','Janith','Chamal','Sanath'],
  female: ['Nadeesha','Dilani','Ruwani','Sachini','Ishara','Dinithi','Sanduni','Harshini','Thilini','Upeksha','Kavindi','Madhavi','Chathurika','Nimasha','Pavithra','Hasini','Rangana','Menaka','Samadhi','Iresha'],
  last: ['Perera','Fernando','Silva','Jayasinghe','Weerasinghe','Bandara','Gunasekara','Ratnayake','Dissanayake','Karunaratne','Wickramasinghe','Hettiarachchi','Pathirana','Kodikara','Jayawardena','Fonseka','Samarasinghe','Abeysekera','Premadasa','Gunawardena']
},
'China': {
  male: ['Li Wei','Wang Lei','Zhang Wei','Liu Yang','Chen Hao','Zhao Ming','Sun Jun','Xu Tao','Wu Han','Zheng Lei','Huang Bo','Gao Jie','Ma Lin','Fang Yong','Song Tao','Guo Liang','Cao Ning','Tan Wei','Xie Ming','Dong Hao'],
  female: ['Li Na','Wang Fang','Zhang Li','Liu Ying','Chen Mei','Zhao Jing','Sun Lan','Xu Yan','Wu Min','Zheng Hui','Huang Li','Gao Xin','Ma Yue','Fang Hua','Song Li','Guo Hong','Cao Yan','Tan Xin','Xie Li','Dong Mei'],
  last: ['Wang','Li','Zhang','Liu','Chen','Yang','Huang','Zhao','Wu','Zhou','Xu','Sun','Ma','Zhu','Hu','Gao','Lin','He','Guo','Lu']
},

'South Korea': {
  male: ['Minho','Jisoo','Hyunwoo','Jinhyuk','Seojun','Taeyang','Kyungsoo','Dongmin','Jongwoo','Hoseok','Sungmin','Yongho','Woojin','Byungwoo','Seungmin','Youngjae','Minsu','Jiwon','Daehyun','Hyeon'],
  female: ['Jisoo','Minji','Hana','Soomin','Yuna','Jiwon','Nara','Seoyeon','Jihee','Hyeri','Yerin','Sora','Bora','Mina','Jieun','Chaeyoung','Suji','Harin','Eunji','Hani'],
  last: ['Kim','Lee','Park','Choi','Jung','Kang','Cho','Yoon','Jang','Lim','Shin','Han','Seo','Kwon','Hwang','Jeon','Baek','Song','Oh','Moon']
},

'Cambodia': {
  male: ['Sok','Vuthy','Sopheak','Dara','Rith','Sarin','Kosal','Sambath','Chin','Pheakdey','Phirun','Kimleng','Samnang','Ronan','Piseth','Khemara','Vannak','Naren','Vichea','Vira'],
  female: ['Srey','Sophea','Chan','Sreyneang','Dalis','Sreypov','Rachana','Kanha','Leakhena','Pheaktra','Sreymao','Malis','Kim','Reaksa','Sreyleak','Chenda','Pich','Sreynich','Devika','Sopheap'],
  last: ['Sok','Chan','Chea','Khun','Hun','Sen','Sam','Pech','Nhem','Yim','Nov','Khim','Ly','Mom','Vong','Hem','Keo','Sim','Meas','Long']
},

'Indonesia': {
  male: ['Ahmad','Agus','Budi','Dedi','Eko','Fajar','Hadi','Iman','Joko','Made','Putra','Rizal','Slamet','Teguh','Wahyu','Yoga','Zain','Arif','Darma','Fikri'],
  female: ['Ayu','Sari','Dewi','Wulan','Rina','Putri','Mega','Nia','Rani','Tika','Ratna','Nadia','Yuni','Sinta','Kartika','Aulia','Melati','Indah','Dewi Ayu','Maya'],
  last: ['Santoso','Wijaya','Saputra','Hidayat','Firmansyah','Siregar','Putra','Pratama','Kurniawan','Yulianto','Rahman','Simanjuntak','Anwar','Susanto','Nugroho','Syahputra','Sutrisno','Gunawan','Wibowo','Aulia']
},

'Malaysia': {
  male: ['Ahmad','Azman','Hafiz','Ibrahim','Kamal','Farid','Rashid','Nizam','Faizal','Shah','Imran','Zain','Amir','Hakim','Syafiq','Razak','Hadi','Faris','Amin','Idris'],
  female: ['Nur','Aisha','Farah','Siti','Nadia','Sarah','Lina','Amira','Rina','Mira','Yasmin','Aminah','Zara','Hani','Sofia','Izzah','Liyana','Dina','Huda','Aina'],
  last: ['Abdullah','Ahmad','Hassan','Rahman','Othman','Yusof','Ismail','Sulaiman','Zainal','Halim','Aziz','Salleh','Latif','Nordin','Bakar','Kamal','Hashim','Nasir','Fadzil','Mansor']
},

'Philippines': {
  male: ['Jose','Juan','Mark','Jerome','Carlos','Miguel','Paolo','Joshua','Christian','Noel','Ramon','Andres','Adrian','Bryan','Elijah','Francis','Daniel','Angelo','Anthony','Nathan'],
  female: ['Maria','Angel','Michelle','Grace','Andrea','Sophia','Nadine','Elaine','Jessica','Nicole','Kathleen','Louise','Patricia','Julie','Jasmine','Erica','Kimberly','Christine','Diana','Alyssa'],
  last: ['Santos','Reyes','Cruz','Dela Cruz','Garcia','Mendoza','Torres','Flores','Diaz','Rivera','Ramos','Aquino','Navarro','Jimenez','Castillo','Villanueva','Bautista','Domingo','Ocampo','Cabrera']
},

'Thailand': {
  male: ['Somchai','Nattapong','Anurak','Chaiwat','Kittisak','Somsak','Pisit','Wichai','Arthit','Thanakorn','Phuwadol','Sakchai','Weerachai','Narin','Rung','Patchara','Suriya','Mongkol','Akkarapong','Prachya'],
  female: ['Sudarat','Jintana','Aom','Pim','Nok','Malee','Chanida','Kanya','Suda','Aree','Ploy','Namfon','Sasi','Thip','Anong','Dao','Ying','Lamai','Pimpa','Noi'],
  last: ['Sukprasert','Kittipong','Wongchai','Chaisiri','Pattaravong','Rattanapong','Sangchai','Wongpanich','Somsri','Thanasuk','Phanuphong','Weerawong','Namsai','Srisuk','Suwan','Srithep','Chalermchai','Decharin','Thongchai','Pongsiri']
},

'Vietnam': {
  male: ['Anh','Minh','Huy','Hoang','Phong','Duc','Tuan','Nam','Khanh','Phuc','Thang','Thanh','Long','Son','Khoa','Bao','Trung','Van','Hai','Lam'],
  female: ['Lan','Hoa','Linh','Trang','Mai','Huong','Anh','Nga','Thao','Quynh','Ly','Thuy','Yen','Ha','Thu','Tam','Kim','Nhung','Van','Diep'],
  last: ['Nguyen','Tran','Le','Pham','Hoang','Bui','Vu','Dang','Do','Ngo','Duong','Ly','Truong','Dinh','Han','Kim','Mai','Quach','Phan','Vo']
},

'Russia': {
  male: ['Ivan','Dmitry','Alexei','Nikolai','Sergei','Vladimir','Pavel','Andrei','Yuri','Oleg','Roman','Konstantin','Maxim','Boris','Kirill','Mikhail','Egor','Ruslan','Timur','Denis'],
  female: ['Anna','Maria','Irina','Elena','Sofia','Nadia','Tatiana','Olga','Daria','Natalia','Polina','Yulia','Valeria','Viktoria','Marina','Oksana','Ekaterina','Alina','Ksenia','Galina'],
  last: ['Ivanov','Smirnov','Kuznetsov','Popov','Sokolov','Volkov','Petrov','Semenov','Egorov','Vinogradov','Pavlov','Mikhailov','Fedorov','Morozov','Romanov','Nikolaev','Lebedev','Belyaev','Antonov','Orlov']
},
    'Australia': {
  male: [
    'Jack','Liam','Noah','Oliver','William','James','Ethan','Lucas','Thomas','Henry',
    'Charlie','Jackson','Samuel','Isaac','Harrison','Mason','Levi','Jacob','Archie','Logan'
  ],
  female: [
    'Charlotte','Amelia','Isla','Olivia','Ava','Mia','Zoe','Ella','Grace','Harper',
    'Sophie','Chloe','Ruby','Matilda','Ivy','Lily','Sienna','Aria','Poppy','Willow'
  ],
  last: [
    'Smith','Jones','Williams','Brown','Wilson','Taylor','Johnson','White','Martin','Anderson',
    'Thompson','Thomas','Walker','Roberts','King','Robinson','Hall','Young','Harris','Edwards'
  ]
},
'New Zealand': {
  male: [
    'Hunter','Lucas','Jack','Noah','Leo','Oliver','Liam','Mason','George','Hugo',
    'Arlo','Elijah','Beau','Henry','Finn','Kaleb','Tama','Nikau','Wiremu','Kauri'
  ],
  female: [
    'Isla','Charlotte','Olivia','Amelia','Ava','Harper','Mia','Ella','Sophie','Willow',
    'Aria','Zoe','Lily','Mila','Hazel','Freya','Aroha','Manaia','Kora','Tui'
  ],
  last: [
    'Smith','Williams','Brown','Wilson','Taylor','Jones','Thompson','White','Walker','King',
    'Robinson','Harris','Campbell','Edwards','Cooper','Clark','Mitchell','Graham','Martin','Anderson'
  ]
},
    'Canada': {
  male: [
    'Liam','Noah','William','Jackson','Logan','Ethan','Lucas','Benjamin','Jacob','Samuel',
    'Oliver','James','Mason','Hunter','Caleb','Nathan','Dylan','Gabriel','Owen','Carter'
  ],
  female: [
    'Emma','Olivia','Charlotte','Ava','Mia','Chloe','Sophie','Emily','Ella','Grace',
    'Isabella','Amelia','Madison','Lily','Zoe','Aria','Nora','Scarlett','Hannah','Claire'
  ],
  last: [
    'Smith','Brown','Tremblay','Martin','Roy','Wilson','Taylor','Anderson','Thompson','Johnson',
    'White','Scott','Campbell','Young','Clark','Hall','Wright','Walker','Bouchard','Gagnon'
  ]
},
'Mexico': {
  male: [
    'Juan','José','Carlos','Miguel','Luis','Javier','Manuel','Alejandro','Ricardo','Fernando',
    'Eduardo','Diego','Roberto','Raul','Andres','Hector','Sergio','Daniel','Francisco','Oscar'
  ],
  female: [
    'Maria','Guadalupe','Sofia','Ana','Carmen','Leticia','Isabella','Fernanda','Patricia','Laura',
    'Gabriela','Paola','Daniela','Lucia','Mariana','Elena','Alejandra','Rosa','Veronica','Silvia'
  ],
  last: [
    'Hernandez','Garcia','Martinez','Lopez','Gonzalez','Rodriguez','Perez','Sanchez','Ramirez','Cruz',
    'Flores','Vargas','Morales','Torres','Reyes','Gutierrez','Diaz','Mendoza','Aguilar','Castro'
  ]
},
'USA': {
  male: [
    'James','John','Robert','Michael','William','David','Daniel','Joseph','Matthew','Andrew',
    'Christopher','Joshua','Ethan','Noah','Logan','Benjamin','Alexander','Jacob','Ryan','Tyler'
  ],
  female: [
    'Emily','Jessica','Sarah','Ashley','Hannah','Olivia','Emma','Sophia','Ava','Mia',
    'Isabella','Abigail','Madison','Elizabeth','Natalie','Grace','Chloe','Ella','Victoria','Lily'
  ],
  last: [
    'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
    'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Moore','Taylor','Jackson','White'
  ]
},
'Bahamas': {
  male: [
    'John','Michael','Denzel','Tyrone','Ethan','Adrian','Marcus','Trevor','Elijah','Nathan',
    'Jordan','Jerome','Alex','Darnell','Shawn','Aaron','Caleb','Chris','Damian','Isaac'
  ],
  female: [
    'Ashley','Brianna','Natalie','Aaliyah','Danielle','Jasmine','Maria','Kiara','Faith','Grace',
    'Ariana','Kayla','Destiny','Gabrielle','Shania','Serena','Makayla','Chantel','Leah','Bianca'
  ],
  last: [
    'Smith','Johnson','Williams','Brown','Davis','Miller','Wilson','Taylor','Anderson','Thompson',
    'Rolle','Ferguson','Darling','Pinder','Knowles','Major','Lightbourne','Sands','Newbold','Bethel'
  ]
},
'Cuba': {
  male: [
    'Jose','Carlos','Luis','Miguel','Juan','Alejandro','Ramon','Ernesto','Hector','Jorge',
    'Pedro','Manuel','Ricardo','Diego','Fernando','Andres','Raul','Oscar','Victor','Antonio'
  ],
  female: [
    'Maria','Ana','Carmen','Isabel','Laura','Sofia','Daniela','Patricia','Lucia','Elena',
    'Paula','Gabriela','Mariana','Silvia','Sandra','Alicia','Juana','Teresa','Claudia','Rosa'
  ],
  last: [
    'Perez','Rodriguez','Gonzalez','Hernandez','Diaz','Fernandez','Ruiz','Suarez','Garcia','Lopez',
    'Castillo','Rivera','Santos','Molina','Cabrera','Leon','Marrero','Acosta','Sierra','Medina'
  ]
},
'Dominican Republic': {
  male: [
    'Juan','Jose','Miguel','Carlos','Luis','Santos','Rafael','Jose Luis','Manuel','Fernando',
    'Andres','Jorge','Ricardo','Pedro','Roberto','Wilson','Diego','Julio','Samuel','Eduardo'
  ],
  female: [
    'Maria','Ana','Carolina','Elena','Isabel','Laura','Sofia','Daniela','Patricia','Gabriela',
    'Sandra','Veronica','Claudia','Diana','Lucia','Paola','Rosario','Carmen','Rosa','Mariela'
  ],
  last: [
    'Rodriguez','Martinez','Perez','Sanchez','Gonzalez','Garcia','Diaz','Reyes','Jimenez','Morales',
    'Ramirez','Torres','Vasquez','Cruz','Mendez','Alvarez','Castillo','Gomez','Santos','Nunez'
  ]
},
'Haiti': {
  male: [
    'Jean','Pierre','Michel','Paul','Andre','Joseph','Daniel','Antoine','Jacques','David',
    'Marc','Samuel','Richard','Luc','Mario','Bernard','Joel','Leon','Claude','Patrick'
  ],
  female: [
    'Marie','Sophia','Nadia','Christelle','Isabelle','Rose','Carine','Esther','Yvonne','Lena',
    'Sabine','Danielle','Nicole','Josette','Fabienne','Elise','Mireille','Sandra','Claudette','Therese'
  ],
  last: [
    'Jean','Joseph','Pierre','Louis','Michel','Charles','Paul','Baptiste','St. Fleur','Dieudonne',
    'Pierre-Louis','Jean-Baptiste','Laguerre','Desir','Augustin','Charles','Simon','Benoit','Francois','Beauvais'
  ]
},
'Jamaica': {
  male: [
    'Dwayne','Jerome','Andre','Malik','Tyrone','David','Michael','Jamal','Trevor','Leon',
    'Kevin','Shawn','Ricardo','Christopher','Omar','Devon','Carl','Nathan','Damian','Marcus'
  ],
  female: [
    'Alicia','Shanice','Danielle','Keisha','Tanya','Monique','Sasha','Kimberly','Nicole','Ashley',
    'Brianna','Jade','Amelia','Faith','Zoe','Kayla','Ariana','Leah','Serena','Naomi'
  ],
  last: [
    'Brown','Williams','Campbell','Smith','Johnson','Miller','Davis','Thompson','Clarke','Robinson',
    'Allen','Stewart','Reid','Wilson','Lewis','James','Gordon','Morgan','Watson','Bryan'
  ]
},
'Costa Rica': {
  male: [
    'Juan','Carlos','Luis','Diego','Jose','Andres','Fernando','Daniel','Alejandro','Ricardo',
    'Miguel','Javier','Manuel','Rafael','Esteban','Jorge','Pablo','Oscar','Adrian','Hector'
  ],
  female: [
    'Maria','Carmen','Ana','Laura','Lucia','Sofia','Isabella','Daniela','Gabriela','Patricia',
    'Elena','Paola','Sandra','Adriana','Mariana','Silvia','Rosa','Claudia','Natalia','Beatriz'
  ],
  last: [
    'Rodriguez','Hernandez','Lopez','Gonzalez','Sanchez','Vargas','Jimenez','Perez','Castro','Romero',
    'Mora','Rojas','Solano','Fernandez','Calderon','Salazar','Alvarado','Cervantes','Morales','Acuna'
  ]
},
'Honduras': {
  male: [
    'Carlos','Jose','Luis','Juan','Miguel','Javier','Ricardo','Manuel','Ramon','Daniel',
    'Hector','Oscar','Fernando','Andres','Pablo','Erick','Jorge','Sergio','Rafael','Eduardo'
  ],
  female: [
    'Maria','Ana','Carmen','Lucia','Daniela','Karla','Paola','Marisol','Gabriela','Laura',
    'Sofia','Sandra','Patricia','Rosa','Veronica','Elena','Mariana','Natalia','Lilian','Yessenia'
  ],
  last: [
    'Lopez','Martinez','Rodriguez','Hernandez','Perez','Gomez','Castro','Flores','Vargas','Morales',
    'Ordonez','Santos','Reyes','Pineda','Torres','Ramirez','Cruz','Mendoza','Avila','Salazar'
  ]
},
'Nicaragua': {
  male: [
    'Juan','Carlos','Luis','Miguel','Jose','Jose Luis','Javier','Ricardo','Ramon','Fernando',
    'Daniel','Jorge','Oscar','Rafael','Andres','Pablo','Eduardo','Roberto','Ernesto','Sergio'
  ],
  female: [
    'Maria','Ana','Carmen','Lucia','Valeria','Daniela','Patricia','Gabriela','Laura','Alejandra',
    'Sandra','Karla','Rosa','Mariela','Carolina','Sofia','Paola','Elena','Teresa','Diana'
  ],
  last: [
    'Lopez','Rodriguez','Gonzalez','Hernandez','Perez','Martinez','Sanchez','Ramirez','Castro','Cruz',
    'Gomez','Flores','Torres','Morales','Navarro','Reyes','Mendoza','Vargas','Rivas','Acosta'
  ]
},
'Panama': {
  male: [
    'Jose','Luis','Carlos','Juan','Miguel','Ricardo','Fernando','Javier','Manuel','Rafael',
    'Oscar','Andres','Pablo','Jorge','Daniel','Arnulfo','Eduardo','Ivan','Roberto','Cristian'
  ],
  female: [
    'Maria','Ana','Carmen','Isabel','Patricia','Daniela','Sofia','Paola','Gabriela','Laura',
    'Mariana','Elena','Lucia','Sandra','Nicole','Adriana','Rosa','Carolina','Katherine','Julieta'
  ],
  last: [
    'Gonzalez','Rodriguez','Perez','Sanchez','Garcia','Fernandez','Lopez','Morales','Vargas','Castillo',
    'Reyes','Herrera','Diaz','Cortes','Martinez','Torres','Valdes','Paredes','Arias','Cabrera'
  ]
},
'Argentina': {
  male: [
    'Juan','Carlos','Diego','Luis','Miguel','Pablo','Jorge','Facundo','Rodolfo','Sergio',
    'Matias','Fernando','Ramon','Lucas','Tomas','Agustin','Nicolas','Hector','Emiliano','Oscar'
  ],
  female: [
    'Maria','Ana','Lucia','Sofia','Camila','Julieta','Florencia','Valentina','Daniela','Carolina',
    'Gabriela','Laura','Paula','Mariana','Elena','Victoria','Natalia','Agustina','Rosa','Claudia'
  ],
  last: [
    'Gonzalez','Rodriguez','Lopez','Martinez','Garcia','Perez','Sanchez','Gomez','Diaz','Fernandez',
    'Castro','Silva','Romero','Alvarez','Molina','Herrera','Suarez','Rojas','Paz','Luna'
  ]
},
'Brazil': {
  male: [
    'Joao','Carlos','Pedro','Lucas','Mateus','Bruno','Rafael','Gabriel','Felipe','Andre',
    'Thiago','Daniel','Eduardo','Fernando','Marcos','Renato','Diego','Roberto','Paulo','Hugo'
  ],
  female: [
    'Maria','Ana','Beatriz','Julia','Sofia','Isabela','Camila','Carla','Fernanda','Laura',
    'Gabriela','Patricia','Luana','Daniela','Renata','Vivian','Claudia','Mariana','Leticia','Paula'
  ],
  last: [
    'Silva','Santos','Oliveira','Souza','Lima','Pereira','Ferreira','Almeida','Costa','Gomes',
    'Ribeiro','Carvalho','Rocha','Dias','Fernandes','Araujo','Castro','Melo','Barbosa','Cardoso'
  ]
},
'Chile': {
  male: [
    'Juan','Carlos','Pedro','Luis','Miguel','Diego','Jorge','Ricardo','Andres','Sebastian',
    'Fernando','Daniel','Cristian','Ramon','Oscar','Pablo','Nicolas','Hector','Raul','Matias'
  ],
  female: [
    'Maria','Ana','Isabel','Daniela','Camila','Francisca','Antonia','Valentina','Gabriela','Carolina',
    'Fernanda','Laura','Cecilia','Rosa','Elena','Mariana','Beatriz','Claudia','Paula','Andrea'
  ],
  last: [
    'Gonzalez','Muñoz','Rojas','Diaz','Soto','Contreras','Silva','Martinez','Perez','Castillo',
    'Lopez','Vargas','Torres','Araya','Flores','Fuentes','Valenzuela','Herrera','Reyes','Molina'
  ]
},
'Colombia': {
  male: [
    'Juan','Carlos','Luis','Miguel','Andres','Jorge','Sebastian','Daniel','Felipe','Oscar',
    'Rafael','Julian','Ricardo','Manuel','Fernando','Pablo','Esteban','Ramon','Ivan','Hector'
  ],
  female: [
    'Maria','Ana','Carmen','Sofia','Daniela','Laura','Valeria','Lucia','Mariana','Paula',
    'Gabriela','Carolina','Natalia','Adriana','Patricia','Sandra','Rosa','Luisa','Claudia','Juliana'
  ],
  last: [
    'Rodriguez','Gonzalez','Martinez','Garcia','Lopez','Hernandez','Perez','Sanchez','Ramirez','Cruz',
    'Castro','Moreno','Vargas','Ortega','Alvarez','Mendoza','Gutierrez','Santos','Salazar','Rios'
  ]
},
'Peru': {
  male: [
    'Juan','Carlos','Luis','Miguel','Jose','Pedro','Rafael','Andres','Jorge','Ricardo',
    'Daniel','Manuel','Fernando','Ramon','Oscar','Hector','Pablo','Ivan','Erick','Diego'
  ],
  female: [
    'Maria','Ana','Lucia','Carmen','Daniela','Sofia','Gabriela','Laura','Patricia','Rosa',
    'Mariana','Elena','Sandra','Paola','Carolina','Marta','Natalia','Adriana','Julia','Teresa'
  ],
  last: [
    'Garcia','Rodriguez','Lopez','Perez','Gonzalez','Sanchez','Ramos','Castillo','Vargas','Rojas',
    'Flores','Diaz','Herrera','Morales','Espinoza','Torres','Mendoza','Paredes','Cabrera','Chavez'
  ]
},
'Paraguay': {
  male: [
    'Juan','Carlos','Luis','Miguel','Jose','Jorge','Ricardo','Ramon','Pablo','Fernando',
    'Diego','Daniel','Roberto','Hector','Ernesto','Raul','Mario','Oscar','Andres','Nicolas'
  ],
  female: [
    'Maria','Ana','Sofia','Gabriela','Laura','Daniela','Lucia','Carolina','Rosa','Mariana',
    'Carmen','Elena','Patricia','Valeria','Sandra','Adriana','Paola','Estela','Juliana','Silvia'
  ],
  last: [
    'Gonzalez','Benitez','Rodriguez','Martinez','Lopez','Perez','Torres','Ramirez','Garcia','Rojas',
    'Vera','Fernandez','Acosta','Ortiz','Ayala','Gomez','Barrios','Morinigo','Villar','Caceres'
  ]
},
'Uruguay': {
  male: [
    'Juan','Carlos','Luis','Miguel','Jorge','Pablo','Fernando','Ramon','Matias','Nicolas',
    'Diego','Rafael','Manuel','Ricardo','Daniel','Oscar','Hector','Agustin','Felipe','Sergio'
  ],
  female: [
    'Maria','Ana','Sofia','Lucia','Carolina','Gabriela','Valentina','Laura','Camila','Patricia',
    'Sandra','Mariana','Isabel','Daniela','Paula','Elena','Beatriz','Natalia','Silvia','Victoria'
  ],
  last: [
    'Gonzalez','Rodriguez','Perez','Fernandez','Lopez','Martinez','Sanchez','Garcia','Morales','Silva',
    'Ramos','Castro','Vazquez','Mendez','Rojas','Torres','Diaz','Barrios','Suarez','Cabrera'
  ]
},
'Venezuela': {
  male: [
    'Juan','Carlos','Jose','Luis','Miguel','Pedro','Andres','Rafael','Ricardo','Manuel',
    'Fernando','Pablo','Jorge','Ramon','Oscar','Daniel','Victor','Leonardo','Diego','Hector'
  ],
  female: [
    'Maria','Ana','Carmen','Isabel','Daniela','Sofia','Gabriela','Valeria','Paola','Lucia',
    'Laura','Mariana','Patricia','Elena','Carolina','Sandra','Nathaly','Yuliana','Rosa','Claudia'
  ],
  last: [
    'Rodriguez','Gonzalez','Perez','Hernandez','Ramirez','Lopez','Martinez','Sanchez','Torres','Morales',
    'Diaz','Rivero','Rojas','Castillo','Mendoza','Acosta','Blanco','Fernandez','Cruz','Soto'
  ]
  },
  'Algeria': {
    male: ['Mohamed', 'Ahmed', 'Ali', 'Omar', 'Karim', 'Rachid', 'Abdel', 'Youssef', 'Said', 'Farid'],
    female: ['Fatima', 'Aicha', 'Nadia', 'Samira', 'Khadija', 'Leila', 'Yasmina', 'Souad', 'Amel', 'Houda'],
    last: ['Bensalah', 'Bouzid', 'Dahmani', 'Benali', 'Cherif', 'Haddad', 'Mahfoud', 'Belkacem', 'Amrani', 'Bouaziz']
  },
  'Egypt': {
    male: ['Mohamed', 'Ahmed', 'Hassan', 'Ali', 'Omar', 'Amr', 'Khaled', 'Tamer', 'Mostafa', 'Youssef'],
    female: ['Fatma', 'Sara', 'Mona', 'Nour', 'Aisha', 'Hanan', 'Rania', 'Salma', 'Laila', 'Dina'],
    last: ['Ahmed', 'Hassan', 'Mohamed', 'Ali', 'Youssef', 'Hussein', 'Said', 'Mostafa', 'Ibrahim', 'Khaled']
  },
  'Libya': {
    male: ['Mohamed', 'Ahmed', 'Ali', 'Abdul', 'Hassan', 'Omar', 'Salah', 'Khalid', 'Nuri', 'Youssef'],
    female: ['Fatima', 'Aisha', 'Mona', 'Samira', 'Amira', 'Nadia', 'Leila', 'Salma', 'Dalia', 'Huda'],
    last: ['Al-Mahdi', 'Al-Sadiq', 'Al-Faraj', 'Al-Amin', 'Al-Hassan', 'Al-Taher', 'Al-Saadi', 'Al-Bashir', 'Al-Khattab', 'Al-Mansour']
  },
  'Morocco': {
    male: ['Mohamed', 'Ahmed', 'Hassan', 'Youssef', 'Abdel', 'Rachid', 'Khalid', 'Omar', 'Amine', 'Said'],
    female: ['Fatima', 'Khadija', 'Nour', 'Salma', 'Sara', 'Aya', 'Zineb', 'Imane', 'Meryem', 'Hanan'],
    last: ['El-Mansouri', 'Bouaziz', 'Haddad', 'Benali', 'Cherkaoui', 'Benzema', 'El-Fassi', 'Oulad', 'Bensalem', 'Mouline']
  },
  'Tunisia': {
    male: ['Mohamed', 'Ahmed', 'Hassan', 'Ali', 'Omar', 'Nabil', 'Karim', 'Sami', 'Tarek', 'Firas'],
    female: ['Fatma', 'Aicha', 'Amal', 'Nadia', 'Meriem', 'Hiba', 'Salma', 'Sara', 'Souad', 'Rania'],
    last: ['Ben Salah', 'Haddad', 'Ben Ali', 'Trabelsi', 'Bouaziz', 'Gharbi', 'Masmoudi', 'Cherif', 'Khadhraoui', 'Fakhfakh']
  },
  'Ivory Coast': {
    male: ['Abdoulaye', 'Mamadou', 'Cheikh', 'Yaya', 'Kouadio', 'Ismael', 'Eric', 'Serge', 'Jean', 'Alain'],
    female: ['Awa', 'Adjoua', 'Fatou', 'Marie', 'Nadia', 'Kady', 'Aminata', 'Sita', 'Claudine', 'Josiane'],
    last: ['Coulibaly', 'Traoré', 'Koné', 'Diallo', 'Sangaré', 'Kouyaté', 'Bamba', 'Fofana', 'Diomandé', 'Kone']
  },
  'Ghana': {
    male: ['Kwame', 'Kofi', 'Yaw', 'Kojo', 'Mensah', 'Nana', 'Yaw', 'Kwaku', 'Emmanuel', 'Samuel'],
    female: ['Ama', 'Akosua', 'Abena', 'Esi', 'Adjoa', 'Akua', 'Yaa', 'Afia', 'Mabel', 'Patience'],
    last: ['Mensah', 'Owusu', 'Boateng', 'Acheampong', 'Amankwah', 'Ofori', 'Boadu', 'Asante', 'Adjei', 'Kwarteng']
  },
  'Mali': {
    male: ['Moussa', 'Oumar', 'Mahamadou', 'Ibrahim', 'Abdoulaye', 'Souleymane', 'Amadou', 'Bakary', 'Cheick', 'Tiemoko'],
    female: ['Aminata', 'Fatoumata', 'Kadidia', 'Hawa', 'Mariama', 'Fanta', 'Rokia', 'Nafissatou', 'Seydou', 'Salimata'],
    last: ['Diarra', 'Traoré', 'Coulibaly', 'Keita', 'Cissé', 'Koné', 'Bamba', 'Sissoko', 'Doumbia', 'Tounkara']
  },
  'Niger': {
    male: ['Abdou', 'Moussa', 'Issouf', 'Mahamadou', 'Oumarou', 'Souleymane', 'Amadou', 'Yacouba', 'Hassane', 'Mahamadou'],
    female: ['Aïssata', 'Fatima', 'Mariama', 'Hawa', 'Rakiya', 'Nafissatou', 'Sonia', 'Zahra', 'Salamatou', 'Ramatou'],
    last: ['Abdoul', 'Hama', 'Issa', 'Moussa', 'Adamou', 'Oumarou', 'Souley', 'Mahamadou', 'Bello', 'Tandja']
  },
  'Nigeria': {
    male: ['Emeka', 'Chinedu', 'Olusegun', 'Ahmed', 'Ibrahim', 'Abubakar', 'Chukwuemeka', 'Segun', 'Tunde', 'Okonkwo'],
    female: ['Ngozi', 'Chioma', 'Aisha', 'Fatima', 'Maryam', 'Funke', 'Hadiza', 'Blessing', 'Ngozi', 'Abimbola'],
    last: ['Okafor', 'Adeyemi', 'Oluwole', 'Abubakar', 'Chukwu', 'Ibrahim', 'Balogun', 'Eze', 'Okonkwo', 'Adebayo']
  },
  'Senegal': {
    male: ['Mamadou', 'Cheikh', 'Ousmane', 'Abdoulaye', 'Ibrahima', 'Babacar', 'Moussa', 'Aliou', 'Serigne', 'Pape'],
    female: ['Aminata', 'Fatou', 'Mariama', 'Coumba', 'Ndeye', 'Rokhaya', 'Adja', 'Ndèye', 'Khady', 'Seynabou'],
    last: ['Diop', 'Ndoye', 'Sow', 'Diallo', 'Ba', 'Fall', 'Seck', 'Gueye', 'Lo', 'Sarr']
  },
  'Togo': {
    male: ['Kodjo', 'Kossi', 'Kwami', 'Komlan', 'Tchagnirou', 'Akom', 'Koffi', 'Yao', 'Ame', 'Fiifi'],
    female: ['Afi', 'Ena', 'Afia', 'Mawuena', 'Akofa', 'Adjoa', 'Kokouvi', 'Sessi', 'Ama', 'Tété'],
    last: ['Aklikokou', 'Agbeko', 'Kossi', 'Tcham', 'Savi', 'Gnakou', 'Akakpo', 'Attipoe', 'Amlan', 'Amoussa']
  },
  'Cameroon': {
    male: ['Jean', 'Pierre', 'Etienne', 'David', 'Emmanuel', 'Joseph', 'Michel', 'Paul', 'André', 'Henri'],
    female: ['Marie', 'Anne', 'Jeanne', 'Madeleine', 'Yvonne', 'Claudine', 'Aminatou', 'Esther', 'Josiane', 'Solange'],
    last: ['Ngannou', 'Moukouri', 'Mbarga', 'Tchoumbou', 'Fokou', 'Essomba', 'Nkounkou', 'Biya', 'Mbang', 'Assoumou']
  },
  'Chad': {
    male: ['Mahamat', 'Abakar', 'Issa', 'Ahmat', 'Brahim', 'Idriss', 'Hissein', 'Salim', 'Ali', 'Oumar'],
    female: ['Fatimé', 'Amina', 'Salma', 'Hawa', 'Nadia', 'Khadidja', 'Mariama', 'Sara', 'Rokia', 'Fadima'],
    last: ['Ngarmadji', 'Abakar', 'Mahamat', 'Idriss', 'Moussa', 'Hissein', 'Souleymane', 'Baba', 'Goukouni', 'Ahmat']
  },
  'Gabon': {
    male: ['Jean', 'Pierre', 'Emmanuel', 'David', 'Michel', 'Alain', 'Franck', 'Patrick', 'Eric', 'Andre'],
    female: ['Marie', 'Angelique', 'Agnès', 'Solange', 'Josiane', 'Rita', 'Chantal', 'Estelle', 'Nadia', 'Yvonne'],
    last: ['Ondo', 'Mouyabi', 'Essono', 'Nze', 'Mbadinga', 'Moukagni', 'Obiang', 'Ntsama', 'Nguema', 'Moussounda']
  },
  'Eritrea': {
    male: ['Tesfay', 'Kidane', 'Yohannes', 'Mebrahtu', 'Samuel', 'Abraham', 'Daniel', 'Tekle', 'Merhawi', 'Haile'],
    female: ['Hana', 'Selam', 'Meron', 'Eleni', 'Mebrahtu', 'Muna', 'Sara', 'Sara', 'Lina', 'Feven'],
    last: ['Berhane', 'Hagos', 'Gebremedhin', 'Tekle', 'Mebrahtu', 'Kidane', 'Haile', 'Yohannes', 'Abraha', 'Ghebremedhin']
  },
  'Ethiopia': {
    male: ['Abebe', 'Tesfaye', 'Haile', 'Kebede', 'Getachew', 'Bekele', 'Yohannes', 'Mekonnen', 'Tadesse', 'Solomon'],
    female: ['Mulu', 'Almaz', 'Lily', 'Selam', 'Tigist', 'Hana', 'Saba', 'Genet', 'Aster', 'Fikirte'],
    last: ['Abebe', 'Bekele', 'Tesfaye', 'Kebede', 'Solomon', 'Mekonnen', 'Yohannes', 'Tadesse', 'Gebre', 'Getachew']
  },
  'Kenya': {
    male: ['James', 'John', 'Peter', 'David', 'Michael', 'Daniel', 'Paul', 'Joseph', 'Robert', 'Charles'],
    female: ['Mary', 'Grace', 'Faith', 'Mercy', 'Mercy', 'Susan', 'Esther', 'Jane', 'Rose', 'Elizabeth'],
    last: ['Otieno', 'Omondi', 'Kamau', 'Mwangi', 'Wanjiku', 'Mutua', 'Okello', 'Odhiambo', 'Kiptoo', 'Chebet']
  },
  'Mozambique': {
    male: ['José', 'Manuel', 'Antonio', 'Carlos', 'João', 'Francisco', 'Miguel', 'Paulo', 'Domingos', 'Filipe'],
    female: ['Maria', 'Ana', 'Fatima', 'Juliana', 'Catarina', 'Lucia', 'Teresa', 'Isabel', 'Raquel', 'Leonor'],
    last: ['Machado', 'Costa', 'Fernandes', 'Da Silva', 'Pereira', 'Domingos', 'Mabote', 'Chissano', 'Mucavele', 'Nhaca']
  },
  'Somalia': {
    male: ['Abdi', 'Mohamed', 'Ahmed', 'Hassan', 'Ismail', 'Ali', 'Yusuf', 'Farah', 'Said', 'Hussein'],
    female: ['Asha', 'Fadumo', 'Hodan', 'Amina', 'Hani', 'Ifrah', 'Nasteexo', 'Sahra', 'Leyla', 'Zahra'],
    last: ['Abdullahi', 'Mohamud', 'Hassan', 'Farah', 'Ali', 'Omar', 'Warsame', 'Roble', 'Mohamed', 'Nur']
  },
  'South Sudan': {
    male: ['Abraham', 'Peter', 'John', 'Michael', 'Daniel', 'David', 'Joseph', 'Simon', 'James', 'Samuel'],
    female: ['Mary', 'Grace', 'Ruth', 'Elizabeth', 'Agnes', 'Rebecca', 'Lilian', 'Anna', 'Sarah', 'Mercy'],
    last: ['Manyok', 'Ayuen', 'Khalil', 'Lual', 'Deng', 'Bol', 'Kuol', 'Garang', 'Malual', 'Achol']
  },
  'Tanzania': {
    male: ['Juma', 'Hassan', 'Mohamed', 'Abdul', 'Ali', 'Bakari', 'Salim', 'Khamis', 'Abdullah', 'Hamisi'],
    female: ['Asha', 'Zainab', 'Fatuma', 'Halima', 'Neema', 'Mariam', 'Salma', 'Hawa', 'Amina', 'Sophia'],
    last: ['Mkapa', 'Nyerere', 'Msuya', 'Moshi', 'Chacha', 'Juma', 'Bakari', 'Komba', 'Mrema', 'Said']
  },
  'Uganda': {
    male: ['John', 'James', 'Peter', 'David', 'Michael', 'Joseph', 'Paul', 'Samuel', 'Daniel', 'Robert'],
    female: ['Mary', 'Grace', 'Ruth', 'Elizabeth', 'Annet', 'Mercy', 'Agnes', 'Sarah', 'Lilian', 'Joy'],
    last: ['Okello', 'Owino', 'Lukwago', 'Namugera', 'Kato', 'Nsubuga', 'Ssebunya', 'Byaruhanga', 'Musoke', 'Mugisha']
  },
  'Zambia': {
    male: ['James', 'Joseph', 'John', 'David', 'Michael', 'Paul', 'Samuel', 'Daniel', 'Patrick', 'Elijah'],
    female: ['Mary', 'Grace', 'Ruth', 'Elizabeth', 'Mercy', 'Agnes', 'Sarah', 'Anita', 'Lilian', 'Rose'],
    last: ['Phiri', 'Chilufya', 'Mwansa', 'Tembo', 'Nkandu', 'Lusaka', 'Zulu', 'Mwewa', 'Kaunda', 'Kaponda']
  },
  'Zimbabwe': {
    male: ['Tendai', 'Tatenda', 'Farai', 'Sipho', 'John', 'Michael', 'Joseph', 'Patrick', 'David', 'Blessing'],
    female: ['Rudo', 'Chipo', 'Tendai', 'Anesu', 'Tsitsi', 'Mary', 'Grace', 'Faith', 'Agnes', 'Mercy'],
    last: ['Moyo', 'Ndlovu', 'Chikomo', 'Dube', 'Chikodzi', 'Mlambo', 'Mutsvairo', 'Chiremba', 'Gumede', 'Mutasa']
  },
  'South Africa': {
    male: ['Sipho', 'Thabo', 'Mandla', 'Lunga', 'John', 'Michael', 'David', 'Joseph', 'Paul', 'Peter'],
    female: ['Nokuthula', 'Thandi', 'Ayanda', 'Zanele', 'Mary', 'Elizabeth', 'Grace', 'Mercy', 'Lerato', 'Busisiwe'],
    last: ['Nkosi', 'Mokoena', 'Dlamini', 'Mthembu', 'Zulu', 'Khumalo', 'Mabuza', 'Ndlela', 'Msimango', 'Shabalala']
  },
  'Angola': {
    male: ['José', 'Manuel', 'Antonio', 'Carlos', 'Paulo', 'Francisco', 'Pedro', 'Miguel', 'Domingos', 'João'],
    female: ['Maria', 'Ana', 'Fatima', 'Isabel', 'Catarina', 'Juliana', 'Lucia', 'Teresa', 'Raquel', 'Leonor'],
    last: ['Silva', 'Dos Santos', 'Pereira', 'Mendes', 'Costa', 'Ferreira', 'Domingos', 'Mabiala', 'Chaves', 'Da Costa']
  }

  };

  const generateEthnicName = (nationality: string) => {
    const set = ethnicNames[nationality] || ethnicNames['Germany'];
    const gender = Math.random() < 0.8 ? 'male' : 'female';
    const first = set[gender][Math.floor(Math.random() * set[gender].length)];
    const last = set.last[Math.floor(Math.random() * set.last.length)];
    return { name: `${first} ${last}`, gender };
  };

  /**
   * generateCandidates
   * @description Generate a set of mock candidates for demo/testing.
   *
   * Behavior changes:
   * - Per-role min/max skill bounds are applied
   *   - drivers: min = 2, max = 3 (ensures richer driver profiles)
   *   - mechanics/managers/dispatchers: min = 0, max = 3
   * - Skills are picked uniquely by shuffling the source array then slicing.
   * - This keeps layout untouched while ensuring drivers often show more skills.
   */
  const generateCandidates = (): Candidate[] => {
    const roles: Array<'driver' | 'mechanic' | 'manager' | 'dispatcher'> = ['driver', 'mechanic', 'manager', 'dispatcher'];
    const countries = ['Germany', 'France', 'Italy', 'Spain', 'Poland', 'Netherlands', 'Belgium', 'Portugal', 'Greece', 'Sweden', 'Hungary', 'Ukraine', 'Serbia', 'Croatia', 'Bulgaria', 'Romania', 'Slovakia', 'Israel', 'Cyprus', 'Armenia', 'Albania', 'Austria', 'Belarus', 'Bosnia and Herzegovina', 'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'Ireland', 'Kosovo', 'Latvia', 'Lithuania', 'Luxembourg', 'Moldova', 'Montenegro', 'North Macedonia', 'Norway', 'Slovenia', 'Switzerland', 'United Kingdom', 'Bahrain', 'Georgia', 'Iran', 'Iraq', 'Jordan', 'Lebanon', 'Oman', 'Syria', 'Turkey', 'Yemen', 'Kazakhstan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan', 'Uzbekistan', 'Afghanistan', 'Bangladesh', 'India', 'Pakistan', 'Sri Lanka', 'China', 'South Korea', 'Cambodia', 'Indonesia', 'Malaysia', 'Philippines', 'Thailand', 'Vietnam', 'Russia', 'Australia', 'New Zealand', 'Canada', 'Mexico', 'USA', 'Bahamas', 'Cuba', 'Dominican Republic', 'Haiti', 'Jamaica', 'Costa Rica', 'Honduras', 'Nicaragua', 'Panama', 'Argentina', 'Brazil', 'Chile', 'Colombia', 'Peru', 'Paraguay', 'Uruguay', 'Venezuela', 'Algeria', 'Egypt', 'Libya', 'Morocco', 'Tunisia', 'Ivory Coast', 'Ghana', 'Mali', 'Niger', 'Nigeria', 'Senegal', 'Togo', 'Cameroon', 'Chad', 'Gabon', 'Eritrea', 'Ethiopia', 'Kenya', 'Mozambique', 'Somalia', 'South Sudan', 'Tanzania', 'Uganda', 'Zambia', 'Zimbabwe', 'South Africa', 'Angola'];
    const skills = {
      driver: ['Long Haul', 'ADR Certified', 'Route Planning', 'Refrigerated Transport', 'Oversized Loads', 'International Routes', 'Night Driving', 'Heavy Load Handling', 'City Navigation', 'Mountain Roads', 'Forest Roads', 'Eco Driving', 'Multi-Axle Experience', 'Tanker Transport', 'Livestock Transport'],
      mechanic: ['Engine Repair', 'Electrical Systems', 'Brake Systems', 'Diagnostics'],
      manager: ['Operations Management', 'Budget Planning', 'Team Leadership', 'Strategic Planning'],
      dispatcher: ['Route Optimization', 'Customer Service', 'Real-time Tracking', 'Communication']
    };

    // Role-specific bounds (min/max skills)
    const roleSkillBounds: Record<'driver' | 'mechanic' | 'manager' | 'dispatcher', { min: number; max: number }> = {
      driver: { min: 2, max: Math.min(3, skills.driver.length) }, // ensure at least 2 driver skills, up to 3
      mechanic: { min: 0, max: Math.min(3, skills.mechanic.length) },
      manager: { min: 0, max: Math.min(3, skills.manager.length) },
      dispatcher: { min: 0, max: Math.min(3, skills.dispatcher.length) }
    };

    return Array.from({ length: 24 }, (_, index) => {
      const role = roles[Math.floor(Math.random() * roles.length)];
      const nationality = countries[Math.floor(Math.random() * countries.length)];
      const experience = Math.floor(Math.random() * 71) + 20; // 20-90%

      const bounds = roleSkillBounds[role];

      // Safety: if min > max for any reason, fallback to max
      const effectiveMin = Math.min(bounds.min, bounds.max);
      const range = bounds.max - effectiveMin;
      const skillCount = range > 0 ? Math.floor(Math.random() * (range + 1)) + effectiveMin : effectiveMin;

      // Shuffle and select unique skills
      const shuffled = [...skills[role]].sort(() => Math.random() - 0.5);
      const candidateSkills = shuffled.slice(0, skillCount);

      const nameData = generateEthnicName(nationality);
      const expectedSalary = calculateSalary(experience, candidateSkills.length);

      return {
        id: `candidate-${index + 1}`,
        name: nameData.name,
        role,
        experience,
        skills: candidateSkills,
        expectedSalary,
        location: 'Unknown City',
        availability: ['immediate', '1week', '2weeks', '3weeks'][Math.floor(Math.random() * 4)] as Candidate['availability'],
        nationality,
        rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
        completedJobs: Math.floor(Math.random() * 150) + 20,
        joinedDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        gender: nameData.gender
      };
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setCandidates(generateCandidates());
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const filteredCandidates = candidates.filter(candidate => {
    const matchesRole = selectedRole === 'all' || candidate.role === selectedRole;
    const matchesSalary = candidate.expectedSalary >= minSalary && candidate.expectedSalary <= maxSalary;
    const notHired = !hiredCandidateIds.has(candidate.id);

    return matchesRole && matchesSalary && notHired;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'driver':
        return 'text-blue-400 bg-blue-400/10';
      case 'mechanic':
        return 'text-orange-400 bg-orange-400/10';
      case 'manager':
        return 'text-purple-400 bg-purple-400/10';
      case 'dispatcher':
        return 'text-green-400 bg-green-400/10';
      default:
        return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'immediate':
        return 'text-green-400 bg-green-400/10';
      case '1week':
        return 'text-yellow-400 bg-yellow-400/10';
      case '2weeks':
        return 'text-orange-400 bg-orange-400/10';
      case '3weeks':
        return 'text-slate-400 bg-slate-400/10';
      default:
        return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'immediate':
        return 'Available Now';
      case '1week':
        return '1 Week Notice';
      case '2weeks':
        return '2 Weeks Notice';
      case '3weeks':
        return '3 Weeks Notice';
      default:
        return availability;
    }
  };

  /**
   * hireCandidate
   * @description Hire a candidate: compute fee based on notice, deduct funds and add to company staff.
   */
  const hireCandidate = (candidate: Candidate) => {
    if (!company) {
      alert('No company found. Please create a company first.');
      return;
    }

    // Determine hiring fee based on availability
    const feePercent = getHiringFeePercent(candidate.availability);
    const hiringFee = Math.floor(candidate.expectedSalary * (feePercent / 100));
    const totalCost = candidate.expectedSalary + hiringFee;

    if (company.capital < totalCost) {
      alert(
        `Insufficient funds! You need €${totalCost.toLocaleString()} (€${candidate.expectedSalary.toLocaleString()} first month + €${hiringFee.toLocaleString()} hiring fee - ${feePercent}% of salary) to hire this candidate.`
      );
      return;
    }

    const delayDays = getAvailabilityDelay(candidate.availability);
    if (delayDays > 0) {
      const availableDate = new Date();
      availableDate.setDate(availableDate.getDate() + delayDays);

      alert(
        `${candidate.name} requires ${delayDays} days notice. They will be available on ${availableDate.toLocaleDateString()}.\n\n€${totalCost.toLocaleString()} will be reserved from your capital now.`
      );

      const updatedCompany = {
        ...company,
        capital: company.capital - totalCost,
        staff: [
          ...(company.staff || []),
          {
            id: candidate.id,
            name: candidate.name,
            role: candidate.role,
            salary: candidate.expectedSalary,
            experience: candidate.experience,
            skills: candidate.skills,
            hiredDate: new Date().toISOString(),
            status: 'resting' as const,
            nationality: candidate.nationality,
            availabilityDate: availableDate.toISOString(),
            noticePeriod: delayDays
          }
        ]
      };

      createCompany(updatedCompany);
      setHiredCandidateIds(prev => new Set([...prev, candidate.id]));
      navigate('/staff');
    } else {
      // Immediate hire
      const updatedCompany = {
        ...company,
        capital: company.capital - totalCost,
        staff: [
          ...(company.staff || []),
          {
            id: candidate.id,
            name: candidate.name,
            role: candidate.role,
            salary: candidate.expectedSalary,
            experience: candidate.experience,
            skills: candidate.skills,
            hiredDate: new Date().toISOString(),
            status: 'available' as const,
            nationality: candidate.nationality,
            availabilityDate: undefined,
            noticePeriod: 0
          }
        ]
      };

      createCompany(updatedCompany);
      setHiredCandidateIds(prev => new Set([...prev, candidate.id]));
      alert(`Successfully hired ${candidate.name} as ${candidate.role}! €${totalCost.toLocaleString()} has been deducted from your capital.`);
      navigate('/staff');
    }
  };

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Briefcase className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Company Found</h2>
          <p className="text-slate-400">Please create a company first to access to Job Centre</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">Job Centre</h1>
          <p className="text-slate-400">Find and hire qualified staff for your transportation company</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">Company Balance</div>
          <div className="text-2xl font-bold text-green-400">€{company.capital.toLocaleString()}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="driver">Drivers</option>
              <option value="mechanic">Mechanics</option>
              <option value="manager">Managers</option>
              <option value="dispatcher">Dispatchers</option>
            </select>
          </div>

          {/* Min Salary Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Min Salary: €{minSalary.toLocaleString()}</label>
            <input
              type="range"
              min="0"
              max="10000"
              step="500"
              value={minSalary}
              onChange={(e) => setMinSalary(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>€0</span>
              <span>€10,000</span>
            </div>
          </div>

          {/* Max Salary Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Max Salary: €{maxSalary.toLocaleString()}</label>
            <input
              type="range"
              min="0"
              max="10000"
              step="500"
              value={maxSalary}
              onChange={(e) => setMaxSalary(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>€0</span>
              <span>€10,000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Candidates Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading candidates...</p>
          </div>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 border border-slate-700 text-center">
          <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Candidates Found</h3>
          <p className="text-slate-400 mb-4">No candidates match your current search criteria.</p>
          <button
            onClick={() => {
              setSelectedRole('all');
              setMinSalary(0);
              setMaxSalary(10000);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((candidate) => {
            const feePercent = getHiringFeePercent(candidate.availability);
            const hiringFee = Math.floor(candidate.expectedSalary * (feePercent / 100));
            const totalCost = candidate.expectedSalary + hiringFee;

            return (
              <div key={candidate.id} className="bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-all duration-200">
                {/* Candidate Header */}
                <div className="p-6 border-b border-slate-700">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-white text-lg">{candidate.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(candidate.role)}`}>
                          {candidate.role.charAt(0).toUpperCase() + candidate.role.slice(1)}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getAvailabilityColor(candidate.availability)}`}>
                          {getAvailabilityText(candidate.availability)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Key Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Experience:</span>
                      <span className="text-white font-medium">{candidate.experience}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nationality:</span>
                      <span className="text-white font-medium">{candidate.nationality}</span>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div className="p-4 border-b border-slate-700">
                  <div className="text-sm text-slate-400 mb-2">Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {candidate.skills.map((skill, index) => (
                      <span key={index} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer with Salary and Hire */}
                <div className="p-4">
                  <div className="flex items-center justify-center mb-3">
                    <div className="text-center">
                      <div className="text-sm text-slate-400">Expected Salary</div>
                      <div className="text-xl font-bold text-green-400">€{candidate.expectedSalary.toLocaleString()}/mo</div>
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="bg-slate-700 rounded-lg p-3 mb-3 border border-slate-600">
                    <div className="text-xs text-slate-400 mb-2">Total Hiring Cost Breakdown:</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-300">First Month Salary:</span>
                        <span className="text-white font-medium">€{candidate.expectedSalary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">Hiring Fee ({feePercent}%):</span>
                        <span className="text-white font-medium">€{hiringFee.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-slate-600 pt-1 mt-1">
                        <div className="flex justify-between">
                          <span className="text-slate-200 font-medium">Total Cost:</span>
                          <span className="text-amber-400 font-bold">€{totalCost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => hireCandidate(candidate)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Hire Candidate</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StaffSkillsOverview />
    </div>
  );
};

export default JobCenter;
