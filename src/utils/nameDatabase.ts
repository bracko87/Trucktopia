/**
 * Comprehensive name database with authentic ethnic combinations
 * Ensures first and last names from same culture for realism
 */

export interface NameSet {
  male: string[];
  female: string[];
  last: string[];
}

export const nameDatabase: Record<string, NameSet> = {
  // ITALIAN NAMES
  'it': {
    male: ['Mario', 'Giuseppe', 'Antonio', 'Giovanni', 'Paolo', 'Francesco', 'Alessandro', 'Roberto', 'Marco', 'Luca', 'Andrea', 'Stefano', 'Matteo', 'Lorenzo', 'Davide', 'Riccardo', 'Federico', 'Simone', 'Giulio', 'Valerio'],
    female: ['Sofia', 'Giulia', 'Martina', 'Chiara', 'Francesca', 'Alessia', 'Valentina', 'Elisa', 'Sara', 'Giorgia', 'Beatrice', 'Greta', 'Aurora', 'Alice', 'Emma', 'Camilla', 'Giusy', 'Ludovica', 'Vittoria', 'Rebecca'],
    last: ['Rossi', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Costa', 'Giordano', 'Mancini', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri']
  },

  // SERBIAN NAMES  
  'rs': {
    male: ['Dragan', 'Milan', 'Nikola', 'Aleksandar', 'Marko', 'Stefan', 'Petar', 'Jovan', 'Miloš', 'Nemanja', 'Vuk', 'Đorđe', 'Uroš', 'Igor', 'Srđan', 'Nebojša', 'Vladimir', 'Branislav', 'Dušan', 'Miroslav'],
    female: ['Jelena', 'Marija', 'Ana', 'Maja', 'Jovana', 'Milica', 'Ivana', 'Tanja', 'Sandra', 'Nataša', 'Danijela', 'Katarina', 'Dragana', 'Vesna', 'Biljana', 'Zorica', 'Olja', 'Jasmina', 'Anđela', 'Milena'],
    last: ['Petrović', 'Jovanović', 'Nikolić', 'Marković', 'Đorđević', 'Stojanović', 'Ilić', 'Stanković', 'Pavlović', 'Milenković', 'Stojić', 'Lukić', 'Popović', 'Pavlović', 'Milanović', 'Milić', 'Kostić', 'Antić', 'Radovanović', 'Martinović']
  },

  // GREEK NAMES
  'gr': {
    male: ['Giorgos', 'Nikolaos', 'Ioannis', 'Konstantinos', 'Dimitris', 'Panagiotis', 'Vasileios', 'Athanasios', 'Christos', 'Emmanouil', 'Michail', 'Spyridon', 'Andreas', 'Sotiris', 'Stavros', 'Theodoros', 'Iosif', 'Charalampos', 'Gregorios', 'Evangelos'],
    female: ['Maria', 'Eleni', 'Katerina', 'Sofia', 'Georgia', 'Vasiliki', 'Angeliki', 'Dimitra', 'Konstantina', 'Panagiota', 'Aikaterini', 'Ioanna', 'Zaharoula', 'Paraskevi', 'Eirini', 'Kalliopi', 'Christina', 'Niki', 'Despoina', 'Lamprini'],
    last: ['Papadopoulos', 'Papadakis', 'Georgiou', 'Nikolaou', 'Constantinou', 'Papageorgiou', 'Demetriou', 'Ioannou', 'Christopoulos', 'Thomas', 'Kiriakidis', 'Anagnostou', 'Alexiou', 'Mihailidis', 'Kalogeropoulos', 'Panagiotidis', 'Sotiriou', 'Karakatsanis', 'Vasilopoulos', 'Petridis']
  },

  // HUNGARIAN NAMES
  'hu': {
    male: ['Péter', 'László', 'István', 'József', 'Gábor', 'Zoltán', 'Ferenc', 'Attila', 'András', 'Balázs', 'Károly', 'Tibor', 'Miklós', 'Tamás', 'Zsolt', 'Csaba', 'György', 'Dániel', 'Márton', 'Roland'],
    female: ['Anna', 'Katalin', 'Mária', 'Éva', 'Judit', 'Zsófia', 'Dóra', 'Anita', 'Klaudia', 'Andrea', 'Krisztina', 'Beáta', 'Enikő', 'Timea', 'Jázmin', 'Réka', 'Lilla', 'Nikolett', 'Viktória', 'Henrietta'],
    last: ['Nagy', 'Kovács', 'Szabó', 'Tóth', 'Varga', 'Horváth', 'Kiss', 'Molnár', 'Németh', 'Farkas', 'Balogh', 'Lakatos', 'Mészáros', 'Oláh', 'Király', 'Bognár', 'Vincze', 'Hegedűs', 'Kelemen', 'Fazekas']
  },

  // RUSSIAN NAMES
  'ru': {
    male: ['Alexander', 'Dmitry', 'Sergey', 'Andrey', 'Alexey', 'Mikhail', 'Ivan', 'Pavel', 'Vladimir', 'Nikolay', 'Egor', 'Roman', 'Vasily', 'Yury', 'Oleg', 'Stanislav', 'Igor', 'Vitaly', 'Denis', 'Konstantin'],
    female: ['Elena', 'Olga', 'Natalia', 'Svetlana', 'Maria', 'Tatiana', 'Anna', 'Irina', 'Ekaterina', 'Lyudmila', 'Valentina', 'Galina', 'Vera', 'Nadezhda', 'Polina', 'Daria', 'Anastasia', 'Larisa', 'Yulia', 'Oksana'],
    last: ['Smirnov', 'Ivanov', 'Kuznetsov', 'Popov', 'Vasiliev', 'Petrov', 'Sokolov', 'Mikhailov', 'Novikov', 'Fedorov', 'Morozov', 'Volkov', 'Alekseev', 'Lebedev', 'Semenov', 'Egorov', 'Pavlov', 'Kozlov', 'Stepanov', 'Nikolaev']
  },

  // POLISH NAMES
  'pl': {
    male: ['Piotr', 'Krzysztof', 'Andrzej', 'Tomasz', 'Jan', 'Marcin', 'Marek', 'Michał', 'Paweł', 'Stanisław', 'Grzegorz', 'Józef', 'Łukasz', 'Jakub', 'Adam', 'Zbigniew', 'Jerzy', 'Rafał', 'Robert', 'Dariusz'],
    female: ['Anna', 'Maria', 'Katarzyna', 'Małgorzata', 'Agnieszka', 'Ewa', 'Joanna', 'Monika', 'Katarzyna', 'Barbara', 'Elżbieta', 'Justyna', 'Beata', 'Danuta', 'Izabela', 'Renata', 'Paulina', 'Alicja', 'Kamila', 'Natalia'],
    last: ['Nowak', 'Kowalski', 'Wiśniewski', 'Wojcik', 'Kowalczyk', 'Kamiński', 'Lewandowski', 'Zielinski', 'Szymanski', 'Wozniak', 'Dąbrowski', 'Kozłowski', 'Jankowski', 'Wójcik', 'Mazur', 'Krawczyk', 'Kaczmarek', 'Piotrowski', 'Grabowski', 'Nowakowski']
  },

  // GERMAN NAMES
  'de': {
    male: ['Hans', 'Peter', 'Klaus', 'Dieter', 'Wolfgang', 'Manfred', 'Jürgen', 'Stefan', 'Thomas', 'Michael', 'Andreas', 'Frank', 'Uwe', 'Günter', 'Horst', 'Joachim', 'Rainer', 'Helmut', 'Karl', 'Rolf'],
    female: ['Petra', 'Sabine', 'Monika', 'Ursula', 'Susanne', 'Andrea', 'Christina', 'Stefanie', 'Karin', 'Elke', 'Brigitte', 'Gabriele', 'Heike', 'Martina', 'Angelika', 'Renate', 'Silvia', 'Beate', 'Julia', 'Simone'],
    last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann']
  },

  // FRENCH NAMES
  'fr': {
    male: ['Jean', 'Pierre', 'Michel', 'Philippe', 'Alain', 'Nicolas', 'Christophe', 'Pascal', 'Laurent', 'Patrick', 'Sébastien', 'Olivier', 'Frédéric', 'David', 'Étienne', 'François', 'Vincent', 'Robert', 'Julien', 'Stéphane'],
    female: ['Marie', 'Isabelle', 'Nathalie', 'Valérie', 'Sylvie', 'Catherine', 'Céline', 'Martine', 'Sophie', 'Nathalie', 'Laurence', 'Monique', 'Christine', 'Sandrine', 'Annie', 'Patricia', 'Claudine', 'Dominique', 'Brigitte', 'Josiane'],
    last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier']
  },

  // SPANISH NAMES
  'es': {
    male: ['José', 'Juan', 'Antonio', 'Francisco', 'Manuel', 'Javier', 'Carlos', 'Miguel', 'Angel', 'Jesús', 'Pedro', 'Luis', 'Rafael', 'Alberto', 'Santiago', 'Andrés', 'Diego', 'Roberto', 'Ramón', 'Fernando'],
    female: ['María', 'Ana', 'Carmen', 'Isabel', 'Margarita', 'Teresa', 'Rosa', 'Pilar', 'Francisca', 'Laura', 'Cristina', 'Elena', 'Patricia', 'Marta', 'Sofía', 'Alicia', 'Silvia', 'Nuria', 'Nieves', 'Beatriz'],
    last: ['García', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Martín', 'Gómez', 'Jiménez', 'Muñoz', 'Alonso', 'Álvarez', 'Moreno', 'Muñoz', 'Díaz', 'Ruiz', 'Moreno', 'Jiménez']
  },

  // PORTUGUESE NAMES
  'pt': {
    male: ['João', 'José', 'Manuel', 'António', 'Pedro', 'Carlos', 'Luís', 'Jorge', 'Rui', 'Paulo', 'Miguel', 'Francisco', 'Tiago', 'André', 'Rodrigo', 'Bruno', 'Ricardo', 'Hugo', 'Sérgio', 'Nuno'],
    female: ['Maria', 'Ana', 'Isabel', 'Catarina', 'Sofia', 'Laura', 'Inês', 'Mariana', 'Leonor', 'Clara', 'Beatriz', 'Matilde', 'Alice', 'Carolina', 'Madalena', 'Rita', 'Francisca', 'Sara', 'Lara', 'Margarida'],
    last: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Costa', 'Oliveira', 'Martins', 'Rodrigues', 'Gomes', 'Almeida', 'Pinto', 'Nogueira', 'Carvalho', 'Teixeira', 'Marques', 'Fonseca', 'Azevedo', 'Dias', 'Lopes', 'Barbosa']
  },

  // DUTCH NAMES
  'nl': {
    male: ['Jan', 'Willem', 'Pieter', 'Hendrik', 'Johannes', 'Jacob', 'Cornelis', 'Abraham', 'Dirk', 'Michael', 'Peter', 'Thomas', 'Daniel', 'Richard', 'Robert', 'Martin', 'Steven', 'Frank', 'Mark', 'Henk'],
    female: ['Anna', 'Petronella', 'Maria', 'Elizabeth', 'Wilhelmina', 'Cornelia', 'Catharina', 'Adriana', 'Margaretha', 'Gerardina', 'Johanna', 'Neeltje', 'Maria', 'Geertruida', 'Lambertje', 'Willemina', 'Annetje', 'Aaltje', 'Marrigje', 'Grietje'],
    last: ['De Jong', 'Jansen', 'De Vries', 'Van den Berg', 'Van Dijk', 'Bakker', 'Visser', 'Smit', 'Meijer', 'De Boer', 'Mulder', 'De Groot', 'Bos', 'Vos', 'Peters', 'Hendriks', 'Van Leeuwen', 'Huisman', 'Kok', 'Schouten']
  },

  // SWEDISH NAMES
  'se': {
    male: ['Erik', 'Lars', 'Johan', 'Nils', 'Anders', 'Per', 'Gunnar', 'Sture', 'Mats', 'Kjell', 'Leif', 'Ove', 'Bo', 'Åke', 'Göran', 'Bengt', 'Ulf', 'Lennart', 'Rolf', 'Dan'],
    female: ['Anna', 'Maria', 'Karin', 'Ingrid', 'Margareta', 'Eva', 'Astrid', 'Britt', 'Marianne', 'Christina', 'Ulla', 'Birgitta', 'Elisabeth', 'Kerstin', 'Gunilla', 'Annika', 'Catherine', 'Susanne', 'Sofia', 'Emma'],
    last: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson', 'Pettersson', 'Jonsson', 'Jansson', 'Hansson', 'Bengtsson', 'Jönsson', 'Lindberg', 'Lindström', 'Lindqvist', 'Mattsson']
  }
};

// Helper function to generate name based on country
export const generateEthnicName = (countryCode: string) => {
  const countryNames = nameDatabase[countryCode] || nameDatabase.de;
  const gender = Math.random() < 0.8 ? 'male' : 'female';
  const firstNames = countryNames[gender];
  const lastName = countryNames.last[Math.floor(Math.random() * countryNames.last.length)];
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  
  return {
    firstName,
    lastName,
    gender,
    nationality: countryCode
  };
};

// Get country name from code
export const getCountryName = (code: string): string => {
  const countries: Record<string, string> = {
    'de': 'Germany',
    'fr': 'France', 
    'it': 'Italy',
    'es': 'Spain',
    'pt': 'Portugal',
    'nl': 'Netherlands',
    'se': 'Sweden',
    'pl': 'Poland',
    'hu': 'Hungary',
    'ro': 'Romania',
    'gr': 'Greece',
    'rs': 'Serbia',
    'ru': 'Russia',
    'bg': 'Bulgaria',
    'cz': 'Czech Republic',
    'sk': 'Slovakia',
    'at': 'Austria',
    'be': 'Belgium',
    'fi': 'Finland',
    'dk': 'Denmark',
    'no': 'Norway',
    'ch': 'Switzerland',
    'ie': 'Ireland',
    'uk': 'United Kingdom'
  };
  return countries[code] || code.toUpperCase();
};