import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  StatusBar as NativeStatusBar,
  useWindowDimensions,
  View,
  ActivityIndicator,
} from 'react-native';

const API_BASE_URL = 'https://erica.devsione.ci';
const API_URL = `${API_BASE_URL}/api/message`;
const HISTORIQUE_URL = `${API_BASE_URL}/api/historique`;
const HEALTH_URL = `${API_BASE_URL}/api/health`;
const CONVERSATION_KEY = '@kaotchin/conversation-v1';
const TIMEOUT = 15000;

const OUTILS = [
  { id: 'cycle', emoji: '🌸', titre: 'Calcul - Période menstruelle' },
  { id: 'respiration', emoji: '🧘', titre: 'Respiration guidée' },
  { id: 'jeu', emoji: '🎮', titre: 'Mini-jeux' },
  { id: 'methodes', emoji: '📚', titre: "Méthodes d'étude" },
  { id: 'conseils', emoji: '💡', titre: 'Conseils bien-être' },
];

const EMOTIONS = [
  '😔 Stressé(e)',
  '😢 Seul(e)',
  '😞 Découragé(e)',
  '😰 Anxieux(se)',
  '😤 En colère',
  '💪 Motivé(e)'
];

const RESPI_ETAPES = [
  { texte: '🌬️ Inspire doucement...', duree: 4000, couleur: '#D6EEE6' },
  { texte: '💨 Retiens ton souffle...', duree: 4000, couleur: '#EEE6D6' },
  { texte: '🌿 Expire lentement...', duree: 6000, couleur: '#D6E4EE' },
  { texte: '🧘 Pause... repose-toi...', duree: 2000, couleur: '#F7F9F8' },
];

// ========== FONCTIONS UTILITAIRES ==========

const nouvellePartie = () => ({ 
  cible: Math.floor(Math.random() * 100) + 1, 
  essais: 0, 
  message: '', 
  gagne: false 
});

const nouveauMathGame = () => ({ 
  num1: Math.floor(Math.random() * 12) + 1, 
  num2: Math.floor(Math.random() * 12) + 1, 
  reponse: 0, 
  message: '', 
  gagne: false 
});

const QUIZ_QUESTIONS = [
  { question: 'Quelle méthode alterne 25 minutes de travail et 5 minutes de pause ?', 
    choix: ['Pomodoro', 'Feynman', 'SQ3R'], 
    reponse: 'Pomodoro' },
  { question: 'Quelle technique consiste à expliquer un cours avec ses propres mots ?', 
    choix: ['Feynman', 'Memory', 'Respiration 4-4-6-2'], 
    reponse: 'Feynman' },
  { question: 'Quelle habitude aide la mémoire à long terme ?', 
    choix: ['Répétition espacée', 'Réviser une seule fois', 'Dormir très peu'], 
    reponse: 'Répétition espacée' },
  { question: 'Que signifie le premier S de SQ3R ?', 
    choix: ['Survoler', 'Souligner', 'Séparer'], 
    reponse: 'Survoler' },
];

const nouveauQuizGame = () => ({ 
  index: Math.floor(Math.random() * QUIZ_QUESTIONS.length), 
  score: 0, 
  message: '' 
});

const nouvelMemoryGame = () => ({
  cartes: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]
    .sort(() => Math.random() - 0.5)
    .map((n, i) => ({ id: i, nombre: n, retourne: false, trouve: false })),
  retourn: [],
  score: 0
});

const formatDate = (valeur) => {
  const chiffres = valeur.replace(/\D/g, '').slice(0, 8);
  if (chiffres.length <= 2) return chiffres;
  if (chiffres.length <= 4) return `${chiffres.slice(0, 2)}/${chiffres.slice(2)}`;
  return `${chiffres.slice(0, 2)}/${chiffres.slice(2, 4)}/${chiffres.slice(4)}`;
};

const personnaliserReponse = (texte, pseudo) => {
  if (!texte || !pseudo) return texte || "Je t'écoute.";

  const pseudosInterdits = [
    'Aicha', 'Aïcha', 'Awa', 'Koffi', 'Mariam', 'Fatou', 'Yao',
    'Jean', 'Marie', 'Paul', 'Amara', 'Bintou', 'Kadiatou',
    'Mamadou', 'Souleymane', 'Aminata', 'Ibrahim', 'Fatima'
  ];

  let reponse = texte
    .replace(/\*?nom de l'utilisateur\*?/gi, pseudo)
    .replace(/\{\{\s*(?:pseudo|nom)\s*\}\}/gi, pseudo);

  pseudosInterdits.forEach((nom) => {
    reponse = reponse.replace(new RegExp(`\\b${nom}\\b`, 'giu'), pseudo);
  });

  return reponse;
};

const soutienUrgent = (pseudo) => 
  `Merci de me l'avoir dit${pseudo ? `, ${pseudo}` : ''}. Tu n'as pas à porter cela seul(e). Un(e) spécialiste a été prévenu(e) pour renforcer ton soutien. En attendant, reste si possible près d'une personne de confiance et éloigne-toi de tout ce qui pourrait te faire du mal. Je reste avec toi : peux-tu me dire où tu es et si quelqu'un peut être à tes côtés maintenant ?`;

const validerPseudo = (texte) => {
  const nettoye = texte.trim();
  if (nettoye.length < 2) {
    return { valide: false, message: 'Minimum 2 caractères' };
  }
  if (nettoye.length > 40) {
    return { valide: false, message: 'Maximum 40 caractères' };
  }
  if (!/^[\p{L}\p{N}\s_.-]+$/u.test(nettoye)) {
    return { valide: false, message: 'Caractères autorisés : lettres, chiffres, espaces, _ . -' };
  }
  return { valide: true, message: '' };
};

// ========== COMPOSANT PRINCIPAL ==========

export default function App() {
  const [connecte, setConnecte] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [outil, setOutil] = useState(null);
  const [estConnecte, setEstConnecte] = useState(true);
  const [cycleDate, setCycleDate] = useState('');
  const [cycleDuree, setCycleDuree] = useState('28');
  const [cycleResultat, setCycleResultat] = useState(null);
  const [respiration, setRespiration] = useState({ actif: false, etape: 0, tours: 0 });
  const [jeu, setJeu] = useState(nouvellePartie);
  const [proposition, setProposition] = useState('');
  const [jeuActif, setJeuActif] = useState('deviner');
  const [mathGame, setMathGame] = useState(nouveauMathGame());
  const [mathProposition, setMathProposition] = useState('');
  const [memoryGame, setMemoryGame] = useState(nouvelMemoryGame());
  const [quizGame, setQuizGame] = useState(nouveauQuizGame());
  const [restaurationTerminee, setRestaurationTerminee] = useState(false);
  const { width, height } = useWindowDimensions();
  const compact = width < 380;
  const tiny = width < 340;
  const largeScreen = width >= 600;
  const shortScreen = height < 700;
  const scrollRef = useRef(null);
  const echecsConnexionRef = useRef(0);

  // ========== EFFETS ==========

  useEffect(() => {
    const restaurerConversation = async () => {
      try {
        const sauvegarde = await AsyncStorage.getItem(CONVERSATION_KEY);
        if (sauvegarde) {
          const { pseudo: ancienPseudo, email: ancienEmail, messages: anciensMessages } = JSON.parse(sauvegarde);
          if (ancienPseudo && Array.isArray(anciensMessages)) {
            setPseudo(ancienPseudo);
            setEmail(ancienEmail || '');
            setMessages(anciensMessages);
            setConnecte(true);
            
            try {
              const reponseServeur = await fetch(HISTORIQUE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pseudo: ancienPseudo }),
                signal: AbortSignal.timeout(5000),
              });
              if (reponseServeur.ok) {
                const data = await reponseServeur.json();
                if (data.historique && Array.isArray(data.historique) && data.historique.length > 0) {
                  const messagesServeur = data.historique.map((msg) => ({
                    texte: msg.contenu,
                    estMoi: msg.cote === 'user',
                    estUrgent: false,
                  }));
                  setMessages(messagesServeur);
                }
              }
            } catch { /* silencieux */ }
          }
        }
      } catch { /* silencieux */ } finally {
        setRestaurationTerminee(true);
      }
    };
    restaurerConversation();
  }, []);

  useEffect(() => {
    if (!restaurationTerminee || !connecte) return;
    AsyncStorage.setItem(CONVERSATION_KEY, JSON.stringify({ pseudo, email, messages })).catch(() => {});
  }, [restaurationTerminee, connecte, pseudo, email, messages]);

  useEffect(() => {
    if (!respiration.actif) return undefined;
    const etape = RESPI_ETAPES[respiration.etape];
    const timeout = setTimeout(() => {
      setRespiration((actuel) => {
        const suivante = (actuel.etape + 1) % RESPI_ETAPES.length;
        const tours = suivante === 0 ? actuel.tours + 1 : actuel.tours;
        if (tours >= 4) {
          Alert.alert('Respiration terminée', 'Tu as fait 4 cycles. Tu devrais te sentir plus calme. 💚');
          return { actif: false, etape: 0, tours: 0 };
        }
        return { ...actuel, etape: suivante, tours };
      });
    }, etape.duree);
    return () => clearTimeout(timeout);
  }, [respiration]);

  useEffect(() => {
    if (connecte) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [connecte, messages, envoi]);

  // Vérification de la connexion réseau
  useEffect(() => {
    const verifierConnexion = async () => {
      try {
        const reponse = await fetch(HEALTH_URL, {
          method: 'GET',
          signal: AbortSignal.timeout(8000),
        });
        if (reponse.ok) {
          echecsConnexionRef.current = 0;
          setEstConnecte(true);
        } else {
          echecsConnexionRef.current += 1;
          if (echecsConnexionRef.current >= 2) setEstConnecte(false);
        }
      } catch {
        echecsConnexionRef.current += 1;
        if (echecsConnexionRef.current >= 2) setEstConnecte(false);
      }
    };
    
    if (connecte) {
      verifierConnexion();
      const interval = setInterval(verifierConnexion, 30000);
      return () => clearInterval(interval);
    }
  }, [connecte]);

  // ========== FONCTIONS ==========

  const commencer = () => {
    const nom = pseudo.trim();
    const validation = validerPseudo(nom);
    if (!validation.valide) {
      Alert.alert('Pseudo invalide', validation.message);
      return;
    }
    setPseudo(nom);
    setMessages([{ texte: `Salut ${nom} ! 🌿 Je suis là pour t'écouter, sans jugement. Comment tu te sens aujourd'hui ?`, estMoi: false }]);
    setConnecte(true);
  };

  const quitter = async () => {
    setConnecte(false);
    setMessages([]);
    setMessage('');
    setEnvoi(false);
    setMenuVisible(false);
    setOutil(null);
    setPseudo('');
    setEmail('');
    try {
      await AsyncStorage.removeItem(CONVERSATION_KEY);
    } catch { /* silencieux */ }
  };

  const envoyer = async (texteAEnvoyer = message.trim()) => {
    if (!texteAEnvoyer || envoi) return;
    setMessages((actuels) => [...actuels, { texte: texteAEnvoyer, estMoi: true }]);
    setMessage('');
    setEnvoi(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT);
      const reponse = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo, email, message: texteAEnvoyer }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
      echecsConnexionRef.current = 0;
      setEstConnecte(true);
      const data = await reponse.json();
      const texteReponse = personnaliserReponse(
        data.reponse || "Je t'écoute. Dis-moi ce que tu ressens.", pseudo
      );
      if (data.niveauAlerte === 3) {
        Alert.alert(
          'Soutien renforcé',
          "Un(e) spécialiste a été alerté(e). Tu n'es pas seul(e) : reste avec nous."
        );
        setMessages((actuels) => [
          ...actuels,
          { texte: texteReponse, estMoi: false },
          { texte: soutienUrgent(pseudo), estMoi: false, estUrgent: true },
        ]);
      } else {
        setMessages((actuels) => [...actuels, { texte: texteReponse, estMoi: false }]);
      }
    } catch (erreur) {
      echecsConnexionRef.current += 1;
      if (echecsConnexionRef.current >= 2) setEstConnecte(false);
      const estTimeout = erreur.name === 'AbortError';
      const msg = estTimeout
        ? "La connexion est trop lente. Vérifie ta connexion internet et réessaie. 🔌"
        : "Je n'arrive pas à joindre le serveur. Vérifie ta connexion internet. 🔌";
      setMessages((actuels) => [...actuels, { texte: msg, estMoi: false }]);
    } finally {
      setEnvoi(false);
    }
  };

  const calculerCycle = () => {
    const match = cycleDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const duree = Number.parseInt(cycleDuree, 10);
    
    if (!match) return Alert.alert('Format incorrect', 'Utilise le format JJ/MM/AAAA.');
    if (!Number.isInteger(duree) || duree < 21 || duree > 35) {
      return Alert.alert('Durée invalide', 'La durée doit être entre 21 et 35 jours.');
    }
    
    const [, jour, mois, annee] = match;
    if (Number(mois) < 1 || Number(mois) > 12) {
      return Alert.alert('Date invalide', 'Le mois doit être compris entre 01 et 12.');
    }
    
    const debut = new Date(Number(annee), Number(mois) - 1, Number(jour));
    if (Number.isNaN(debut.getTime())) {
      return Alert.alert('Date invalide', 'Vérifie la date saisie.');
    }
    
    const dateAjoutee = (jours) => new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + jours);
    const ajoute = (jours) => dateAjoutee(jours).toLocaleDateString('fr-FR');
    
    const prochaineDate = dateAjoutee(duree);
    const joursRestants = Math.ceil((prochaineDate - new Date()) / (1000 * 60 * 60 * 24));
    
    let conseil = '';
    if (joursRestants <= 3 && joursRestants > 0) {
      conseil = "📝 Tes règles approchent ! Pense à te reposer et à t'hydrater. 💧";
    } else if (joursRestants <= 10 && joursRestants > 3) {
      conseil = "🌱 Tu es en phase prémenstruelle. Écoute ton corps et prends soin de toi. 💚";
    } else if (joursRestants > 10) {
      conseil = "🌸 Profite de cette période pour être active et concentrée ! ✨";
    } else if (joursRestants <= 0 && Math.abs(joursRestants) <= 5) {
      conseil = "🌺 Tes règles sont peut-être en cours. Prends soin de toi, repose-toi et hydrate-toi. 💕";
    } else {
      conseil = "🌸 Tu entres dans une nouvelle phase. Continue à observer ton corps avec douceur. ✨";
    }
    
    setCycleResultat({ 
      prochaines: ajoute(duree), 
      ovulation: ajoute(duree - 14), 
      debut: ajoute(duree - 19), 
      fin: ajoute(duree - 13), 
      conseil 
    });
  };

  const deviner = () => {
    const nombre = Number.parseInt(proposition, 10);
    if (!Number.isInteger(nombre) || nombre < 1 || nombre > 100) {
      return Alert.alert('Nombre invalide', 'Entre un nombre entre 1 et 100.');
    }
    setJeu((actuel) => {
      const essais = actuel.essais + 1;
      if (nombre === actuel.cible) {
        return { ...actuel, essais, gagne: true, message: `🎉 Bravo ! Trouvé en ${essais} essai${essais > 1 ? 's' : ''} !` };
      }
      return { ...actuel, essais, message: nombre < actuel.cible ? `📈 C'est plus grand ! (essai ${essais})` : `📉 C'est plus petit ! (essai ${essais})` };
    });
    setProposition('');
  };

  const calculerMath = () => {
    const rep = Number.parseInt(mathProposition, 10);
    const resultatCorrect = mathGame.num1 * mathGame.num2;
    if (!Number.isInteger(rep)) {
      return Alert.alert('Nombre invalide', 'Entre un nombre valide.');
    }
    if (rep === resultatCorrect) {
      setMathGame({ ...mathGame, gagne: true, message: `🎉 Bravo ! ${mathGame.num1} × ${mathGame.num2} = ${resultatCorrect}` });
    } else {
      setMathGame({ ...mathGame, message: `❌ Faux ! La bonne réponse est ${resultatCorrect}.` });
    }
    setMathProposition('');
  };

  const retournerCarteMem = (index) => {
    if (memoryGame.retourn.length >= 2) return;
    if (memoryGame.cartes[index].retourne || memoryGame.cartes[index].trouve) return;
    
    const newCarte = memoryGame.cartes.map((c, i) => i === index ? { ...c, retourne: true } : c);
    const newRetourn = [...memoryGame.retourn, index];
    
    if (newRetourn.length === 2) {
      if (newCarte[newRetourn[0]].nombre === newCarte[newRetourn[1]].nombre) {
        setTimeout(() => {
          setMemoryGame(old => ({
            ...old,
            cartes: old.cartes.map((c, i) => newRetourn.includes(i) ? { ...c, trouve: true, retourne: false } : c),
            retourn: [],
            score: old.score + 1
          }));
        }, 600);
      } else {
        setTimeout(() => {
          setMemoryGame(old => ({
            ...old,
            cartes: old.cartes.map((c, i) => newRetourn.includes(i) ? { ...c, retourne: false } : c),
            retourn: []
          }));
        }, 600);
      }
    } else {
      setMemoryGame({ ...memoryGame, cartes: newCarte, retourn: newRetourn });
    }
  };

  const repondreQuiz = (choix) => {
    const question = QUIZ_QUESTIONS[quizGame.index];
    const correct = choix === question.reponse;
    setQuizGame({
      index: (quizGame.index + 1) % QUIZ_QUESTIONS.length,
      score: correct ? quizGame.score + 1 : quizGame.score,
      message: correct ? '🎉 Bonne réponse !' : `💡 La bonne réponse était : ${question.reponse}`,
    });
  };

  const ouvrirDiscussion = () => {
    setOutil(null);
    setMenuVisible(false);
  };

  const ouvrirOutil = (id) => {
    setOutil(id);
    setMenuVisible(false);
  };

  // ========== RENDU ==========

  if (!restaurationTerminee) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2E7D64" />
          <Text style={styles.loadingText}>Chargement de ta conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!connecte) {
    return <Accueil 
      pseudo={pseudo} 
      setPseudo={setPseudo} 
      email={email} 
      setEmail={setEmail} 
      commencer={commencer} 
      compact={compact}
      shortScreen={shortScreen}
      validerPseudo={validerPseudo}
    />;
  }

  const afficherOutil = connecte && outil;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {afficherOutil ? (
        <Outil 
          id={outil} 
          retour={ouvrirDiscussion} 
          cycleDate={cycleDate} 
          setCycleDate={setCycleDate} 
          cycleDuree={cycleDuree} 
          setCycleDuree={setCycleDuree} 
          cycleResultat={cycleResultat} 
          calculerCycle={calculerCycle} 
          respiration={respiration} 
          setRespiration={setRespiration} 
          jeu={jeu} 
          setJeu={setJeu} 
          proposition={proposition} 
          setProposition={setProposition} 
          deviner={deviner}
          jeuActif={jeuActif}
          setJeuActif={setJeuActif}
          mathGame={mathGame}
          setMathGame={setMathGame}
          mathProposition={mathProposition}
          setMathProposition={setMathProposition}
          calculerMath={calculerMath}
          memoryGame={memoryGame}
          setMemoryGame={setMemoryGame}
          retournerCarteMem={retournerCarteMem}
          quizGame={quizGame}
          setQuizGame={setQuizGame}
          repondreQuiz={repondreQuiz}
          compact={compact}
          styles={styles}
        />
      ) : (
        <KeyboardAvoidingView 
          style={styles.flex} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          keyboardVerticalOffset={0}
        >
          <Header 
            ouvrir={() => setMenuVisible(true)} 
            quitter={quitter}
            estConnecte={estConnecte}
            tiny={tiny}
          />
          
          <ScrollView 
            ref={scrollRef} 
            style={styles.messageScroll} 
            contentContainerStyle={[styles.messages, largeScreen && styles.messagesWide]} 
            keyboardShouldPersistTaps="handled" 
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((item, index) => (
              <View key={index} style={[styles.ligne, item.estMoi && styles.ligneMoi]}>
                <Text style={[
                  styles.bulle,
                  compact && styles.bulleCompact,
                  largeScreen && styles.bulleWide,
                  item.estMoi ? styles.bulleMoi : item.estUrgent ? styles.bulleUrgente : styles.bulleBot
                ]}>
                  {item.texte}
                </Text>
              </View>
            ))}
            {envoi && (
              <View style={styles.ligne}>
                <Text style={[styles.bulle, styles.bulleBot]}>
                  <ActivityIndicator size="small" color="#2E7D64" /> En train d'écrire...
                </Text>
              </View>
            )}
          </ScrollView>
          
          <View style={styles.composer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              keyboardShouldPersistTaps="handled" 
              contentContainerStyle={styles.emotions}
            >
              {EMOTIONS.map((emotion) => (
                <Pressable key={emotion} onPress={() => setMessage(emotion)} style={styles.chip}>
                  <Text style={styles.chipText}>{emotion}</Text>
                </Pressable>
              ))}
            </ScrollView>
            
            <View style={[styles.saisie, largeScreen && styles.saisieWide]}>
              <TextInput 
                value={message} 
                onChangeText={setMessage} 
                onSubmitEditing={() => envoyer()} 
                placeholder="Écris ce que tu ressens…" 
                placeholderTextColor="#7C9089" 
                style={[styles.messageInput, compact && styles.messageInputCompact]} 
                returnKeyType="send" 
                blurOnSubmit={false} 
                multiline 
              />
              <Pressable 
                accessibilityRole="button" 
                accessibilityLabel="Envoyer le message" 
                style={[styles.send, (!message.trim() || envoi) && styles.sendDisabled]} 
                onPress={() => envoyer()}
                disabled={!message.trim() || envoi}
              >
                <Text style={styles.sendText}>{envoi ? '⏳' : '➤'}</Text>
              </Pressable>
            </View>
            
          </View>
        </KeyboardAvoidingView>
      )}
      
      <Modal visible={connecte && menuVisible} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.menu} onPress={() => {}}>
            <Text style={styles.menuTitle}>🫀 KAOTCHIN</Text>
            <Text style={styles.menuSection}>BIEN-ÊTRE</Text>
            {OUTILS.map((item) => (
              <Pressable 
                key={item.id} 
                style={styles.menuItem} 
                onPress={() => ouvrirOutil(item.id)}
              >
                <Text style={styles.menuEmoji}>{item.emoji}</Text>
                <Text style={styles.menuText}>{item.titre}</Text>
              </Pressable>
            ))}
            <Pressable 
              style={styles.menuItem} 
              onPress={() => ouvrirOutil('urgence')}
            >
              <Text style={styles.menuEmoji}>🆘</Text>
              <Text style={styles.urgence}>En cas d'urgence</Text>
            </Pressable>
            
            <Text style={styles.menuSection}></Text>
            <Text style={styles.menuSection}>COMPTE</Text>
            <Pressable style={styles.menuItem} onPress={quitter}>
              <Text style={styles.menuEmoji}>🚪</Text>
              <Text style={[styles.menuText, { color: '#F3A08A' }]}>Quitter</Text>
            </Pressable>
            
            <Text style={styles.menuBottom}>🔒 Espace anonyme · {pseudo}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ========== COMPOSANTS ==========

function Accueil({ pseudo, setPseudo, email, setEmail, commencer, compact, shortScreen, validerPseudo }) {
  const [validation, setValidation] = useState({ valide: true, message: '' });
  
  const handlePseudoChange = (texte) => {
    setPseudo(texte);
    setValidation(validerPseudo(texte));
  };
  
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView 
        contentContainerStyle={[styles.accueil, compact && styles.accueilCompact, shortScreen && styles.accueilShort]} 
        keyboardShouldPersistTaps="handled"
      >
        <Image 
          source={require('./assets/icon.png')} 
          style={[styles.logoImage, compact && styles.logoImageCompact, shortScreen && styles.logoImageShort]} 
          resizeMode="contain" 
          accessibilityLabel="Logo KAOTCHIN" 
        />
        <Text style={[styles.appName, compact && styles.appNameCompact]}>KAOTCHIN</Text>
        <Text style={styles.tagline}>L'oreille qui écoute</Text>
        
        <Text style={styles.fieldLabel}>Ton prénom ou ton pseudo <Text style={styles.required}>*</Text></Text>
        <TextInput 
          style={[styles.input, !validation.valide && styles.inputErreur]} 
          value={pseudo} 
          onChangeText={handlePseudoChange} 
          placeholder="Ex. Aïcha" 
          autoCapitalize="words" 
          autoComplete="nickname" 
        />
        {!validation.valide && <Text style={styles.erreurTexte}>{validation.message}</Text>}
        
        <Text style={styles.fieldLabel}>Ton adresse e-mail <Text style={styles.optional}>(facultatif)</Text></Text>
        <TextInput 
          style={styles.input} 
          value={email} 
          onChangeText={setEmail} 
          placeholder="Ex. aicha@email.com" 
          keyboardType="email-address" 
          autoCapitalize="none" 
          autoComplete="email" 
        />
        
        <Text style={styles.note}>🔒 Ces informations resteront confidentielles.</Text>
        
        <Pressable 
          disabled={!pseudo.trim() || !validation.valide} 
          style={[styles.commencer, (!pseudo.trim() || !validation.valide) && styles.disabled]} 
          onPress={commencer}
        >
          <Text style={styles.commencerText}>COMMENCER →</Text>
        </Pressable>
        
        <Text style={styles.noteBas}>
          🔒 100% anonyme · Personne ne saura que c'est toi{`\n`}
          Ce que tu écris ici reste confidentiel.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ ouvrir, quitter, estConnecte, tiny }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Pressable onPress={ouvrir} style={styles.burger}>
          <Text>☰</Text>
        </Pressable>
        <View style={styles.headerBrand}>
          <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>KAOTCHIN</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, estConnecte ? styles.statusOnline : styles.statusOffline]} />
            {!tiny && (
              <Text style={styles.statusText} numberOfLines={1}>
                {estConnecte ? 'En ligne' : 'Connexion instable'}
              </Text>
            )}
          </View>
        </View>
      </View>
      <View style={styles.headerRight}>
        <Pressable onPress={quitter}>
          <Text style={styles.quitter} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Quitter</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Outil(props) {
  const { id, retour } = props;
  return (
    <View style={props.styles.flex}>
      <View style={props.styles.header}>
        <Pressable onPress={retour}>
          <Text style={props.styles.back}>←</Text>
        </Pressable>
        <Text style={props.styles.headerTitle}>
          {id === 'urgence' ? "En cas d'urgence" : OUTILS.find((item) => item.id === id)?.titre}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={props.styles.outil}>
        {id === 'cycle' && <Cycle {...props} />}
        {id === 'respiration' && <Respiration {...props} />}
        {id === 'jeu' && <JeuxAccueil {...props} />}
        {id === 'methodes' && <Methodes />}
        {id === 'conseils' && <Conseils />}
        {id === 'urgence' && <Urgence />}
      </ScrollView>
    </View>
  );
}

function Carte({ children }) {
  return <View style={styles.carte}>{children}</View>;
}

function Cycle({ cycleDate, setCycleDate, cycleDuree, setCycleDuree, cycleResultat, calculerCycle }) {
  return (
    <Carte>
      <Text style={styles.carteTitre}>🌸 Calcul de Période Menstruelle</Text>
      <Text style={styles.texte}>Suivi de ton cycle menstruel pour mieux comprendre ton corps et prévoir tes prochaines règles.</Text>
      <Text style={styles.texte}>Date du début de tes dernières règles :</Text>
      <Text style={styles.dateHint}>Format attendu : JJ/MM/AAAA (ex. 07/06/2026)</Text>
      <TextInput 
        style={styles.input} 
        value={cycleDate} 
        onChangeText={(valeur) => setCycleDate(formatDate(valeur))} 
        placeholder="JJ/MM/AAAA" 
        keyboardType="numeric" 
        maxLength={10} 
      />
      <Text style={styles.texte}>Durée moyenne de ton cycle (en jours) :</Text>
      <TextInput 
        style={styles.input} 
        value={cycleDuree} 
        onChangeText={setCycleDuree} 
        keyboardType="numeric" 
        maxLength={2} 
        placeholder="28" 
      />
      <Button titre="📅 Calculer mes prochaines règles" onPress={calculerCycle} />
      {cycleResultat && (
        <View style={styles.resultat}>
          <Text>📅 <Text style={{fontWeight: 'bold'}}>Prochaines règles :</Text> {cycleResultat.prochaines}</Text>
          <Text>🥚 <Text style={{fontWeight: 'bold'}}>Ovulation estimée :</Text> {cycleResultat.ovulation}</Text>
          <Text>💫 <Text style={{fontWeight: 'bold'}}>Période féconde :</Text> du {cycleResultat.debut} au {cycleResultat.fin}</Text>
          {cycleResultat.conseil && (
            <Text style={{marginTop: 10, fontStyle: 'italic', color: '#2E7D64'}}>
              {cycleResultat.conseil}
            </Text>
          )}
        </View>
      )}
      <Text style={styles.avertissement}>⚠️ Ceci est une estimation. Le cycle peut varier. Consulte un médecin pour des questions médicales.</Text>
    </Carte>
  );
}

function Respiration({ respiration, setRespiration }) {
  const etape = RESPI_ETAPES[respiration.etape];
  return (
    <Carte>
      <Text style={styles.texte}>Technique 4-4-6-2. Quatre cycles complets.</Text>
      {respiration.actif && (
        <View style={[styles.respiration, { backgroundColor: etape.couleur }]}>
          <Text style={styles.respirationText}>{etape.texte}</Text>
          <Text>Cycle {respiration.tours + 1} / 4</Text>
        </View>
      )}
      <Button 
        titre={respiration.actif ? '⏹ Arrêter' : '▶️ Commencer'} 
        onPress={() => setRespiration(respiration.actif ? { actif: false, etape: 0, tours: 0 } : { actif: true, etape: 0, tours: 0 })} 
      />
    </Carte>
  );
}

function JeuxAccueil({ jeuActif, setJeuActif, jeu, setJeu, proposition, setProposition, deviner, mathGame, setMathGame, mathProposition, setMathProposition, calculerMath, memoryGame, setMemoryGame, retournerCarteMem, quizGame, setQuizGame, repondreQuiz }) {
  const questionQuiz = QUIZ_QUESTIONS[quizGame.index];
  return (
    <View>
      <Carte>
        <Text style={styles.carteTitre}>🎮 Mini-Jeux Éducatifs</Text>
        <Text style={styles.texte}>Relaxe-toi en jouant tout en aiguisant ton esprit ! 🧠</Text>
        <View style={styles.gameTabsContainer}>
          <Pressable style={[styles.gameTab, jeuActif === 'deviner' && styles.gameTabActive]} onPress={() => setJeuActif('deviner')}>
            <Text style={[styles.gameTabText, jeuActif === 'deviner' && styles.gameTabActiveText]}>Devin le nombre</Text>
          </Pressable>
          <Pressable style={[styles.gameTab, jeuActif === 'math' && styles.gameTabActive]} onPress={() => setJeuActif('math')}>
            <Text style={[styles.gameTabText, jeuActif === 'math' && styles.gameTabActiveText]}>Calcul rapide</Text>
          </Pressable>
          <Pressable style={[styles.gameTab, jeuActif === 'memory' && styles.gameTabActive]} onPress={() => setJeuActif('memory')}>
            <Text style={[styles.gameTabText, jeuActif === 'memory' && styles.gameTabActiveText]}>Memory</Text>
          </Pressable>
          <Pressable style={[styles.gameTab, jeuActif === 'quiz' && styles.gameTabActive]} onPress={() => setJeuActif('quiz')}>
            <Text style={[styles.gameTabText, jeuActif === 'quiz' && styles.gameTabActiveText]}>Quiz bien-être</Text>
          </Pressable>
        </View>
      </Carte>

      {jeuActif === 'deviner' && (
        <Carte>
          <Text style={styles.carteTitre}>🎯 Devine le nombre</Text>
          <Text style={styles.texte}>Trouve le nombre mystère entre 1 et 100.</Text>
          {!jeu.gagne && (
            <TextInput 
              style={styles.input} 
              value={proposition} 
              onChangeText={setProposition} 
              placeholder="Entre un nombre" 
              keyboardType="numeric" 
            />
          )}
          {jeu.gagne ? (
            <Button titre="🔄 Rejouer" onPress={() => setJeu(nouvellePartie())} />
          ) : (
            <Button titre="🎯 Deviner" onPress={deviner} />
          )}
          {Boolean(jeu.message) && <Text style={styles.center}>{jeu.message}</Text>}
        </Carte>
      )}

      {jeuActif === 'math' && (
        <Carte>
          <Text style={styles.carteTitre}>📐 Calcul rapide</Text>
          <Text style={styles.texte}>Teste ta rapidité en résolvant des multiplications !</Text>
          <Text style={styles.mathProblem}>{mathGame.num1} × {mathGame.num2} = ?</Text>
          {!mathGame.gagne && (
            <TextInput 
              style={styles.input} 
              value={mathProposition} 
              onChangeText={setMathProposition} 
              placeholder="Réponse" 
              keyboardType="numeric" 
            />
          )}
          {mathGame.gagne ? (
            <Button titre="🔄 Nouvelle opération" onPress={() => setMathGame(nouveauMathGame())} />
          ) : (
            <Button titre="✓ Valider" onPress={calculerMath} />
          )}
          {Boolean(mathGame.message) && <Text style={styles.center}>{mathGame.message}</Text>}
        </Carte>
      )}

      {jeuActif === 'memory' && (
        <Carte>
          <Text style={styles.carteTitre}>🧠 Memory</Text>
          <Text style={styles.texte}>Retrouve les paires de nombres identiques ! Score: {memoryGame.score}/6</Text>
          <View style={styles.memoryGrid}>
            {memoryGame.cartes.map((carte, idx) => (
              <Pressable 
                key={carte.id} 
                style={[styles.memoryCard, carte.trouve && styles.memoryCardFound]} 
                onPress={() => retournerCarteMem(idx)} 
                disabled={carte.trouve || carte.retourne}
              >
                <Text style={styles.memoryCardText}>
                  {carte.retourne || carte.trouve ? carte.nombre : '?'}
                </Text>
              </Pressable>
            ))}
          </View>
          {memoryGame.score === 6 && (
            <Text style={styles.winner}>🎉 Tu as gagné ! Bien joué !</Text>
          )}
          <Button titre="🔄 Recommencer Memory" onPress={() => setMemoryGame(nouvelMemoryGame())} />
        </Carte>
      )}

      {jeuActif === 'quiz' && (
        <Carte>
          <Text style={styles.carteTitre}>🏆 Quiz bien-être et études</Text>
          <Text style={styles.texte}>{questionQuiz.question}</Text>
          <View style={styles.quizChoices}>
            {questionQuiz.choix.map((choix) => (
              <Pressable key={choix} style={styles.quizChoice} onPress={() => repondreQuiz(choix)}>
                <Text style={styles.quizChoiceText}>{choix}</Text>
              </Pressable>
            ))}
          </View>
          {Boolean(quizGame.message) && <Text style={styles.center}>{quizGame.message}</Text>}
          <Text style={styles.center}>Score : {quizGame.score}</Text>
          <Button titre="🔄 Repartir à zéro" onPress={() => setQuizGame(nouveauQuizGame())} />
        </Carte>
      )}
    </View>
  );
}

function Methodes() {
  const methodes = [
    'Mind Map pour organiser les idées',
    'Répétition espacée pour mémoriser',
    'Feynman pour comprendre vraiment',
    'Écriture active pour retenir',
    'SQ3R pour les longs chapitres',
  ];
  return (
    <View>
      <Carte>
        <Text style={styles.carteTitre}>📚 Méthodes d'Étude Efficaces</Text>
        <Text style={styles.texte}>Choisis une méthode selon ton besoin du moment, puis combine-les pour créer ta propre routine.</Text>
        <View style={styles.methodesGrid}>
          {methodes.map((methode) => (
            <Text key={methode} style={styles.methodeChip}>{methode}</Text>
          ))}
        </View>
      </Carte>

      <Carte>
        <Text style={styles.carteTitre}>🍅 Méthode Pomodoro</Text>
        <Text style={styles.texte}>
          Technique de gestion du temps : 25 minutes de travail intense
          suivies de 5 minutes de pause. Après 4 cycles, fais une grande
          pause de 20 minutes.
        </Text>
        <Text style={styles.liste}>• Améliore la concentration</Text>
        <Text style={styles.liste}>• Réduit la procrastination</Text>
        <Text style={styles.liste}>• Évite la fatigue mentale</Text>
        <Text style={styles.casUtilisation}>
          💡 Applique ce rythme quand tu veux avancer sans t'épuiser.
        </Text>
      </Carte>

      <Carte>
        <Text style={styles.carteTitre}>🗺️ Mind Map (Carte Mentale)</Text>
        <Text style={styles.liste}>• Utilise des branches pour connecter les idées</Text>
        <Text style={styles.liste}>• Ajoute des couleurs pour mieux mémoriser</Text>
        <Text style={styles.liste}>• Idéale pour voir l'ensemble d'un sujet</Text>
        <Text style={styles.casUtilisation}>💡 Idéale pour : Résumer des chapitres complexes, organiser des projets, réviser avant un examen</Text>
      </Carte>

      <Carte>
        <Text style={styles.carteTitre}>🔁 Répétition Espacée</Text>
        <Text style={styles.liste}>• Révise à J+1 (le lendemain)</Text>
        <Text style={styles.liste}>• Puis à J+3 (3 jours après)</Text>
        <Text style={styles.liste}>• Puis à J+7 (1 semaine après)</Text>
        <Text style={styles.liste}>• Et à J+21 (3 semaines après)</Text>
        <Text style={styles.casUtilisation}>💡 Idéale pour : Apprendre des vocabulaires, retenir des formules, consolider tes connaissances</Text>
        <Text style={{color: '#5C6B65', marginTop: 8, fontStyle: 'italic'}}>Cela renforce la mémoire long terme ! 💪</Text>
      </Carte>

      <Carte>
        <Text style={styles.carteTitre}>🗣️ Méthode Feynman</Text>
        <Text style={styles.liste}>• Explique le cours à voix haute</Text>
        <Text style={styles.liste}>• Imagine que tu l'enseigne à quelqu'un</Text>
        <Text style={styles.casUtilisation}>💡 Idéale pour : Maîtriser des concepts difficiles, préparer tes exposés, détecter tes lacunes</Text>
        <Text style={styles.liste}>• Identifie les lacunes dans ta compréhension</Text>
      </Carte>

      <Carte>
        <Text style={styles.carteTitre}>✍️ Écriture Active</Text>
        <Text style={styles.liste}>• Écris à la main (pas d'ordi !) pour mieux retenir</Text>
        <Text style={styles.liste}>• Surligne les points clés</Text>
        <Text style={styles.casUtilisation}>💡 Idéale pour : Prendre des notes efficaces, tracer tes révisions, créer tes propres fiches</Text>
        <Text style={styles.liste}>• Fais tes propres résumés</Text>
      </Carte>

      <Carte>
        <Text style={styles.carteTitre}>🎯 Méthode SQ3R</Text>
        <Text style={styles.liste}>• <Text style={{fontWeight: 'bold'}}>S</Text>urvole : parcoure le chapitre rapidement</Text>
        <Text style={styles.liste}>• <Text style={{fontWeight: 'bold'}}>Q</Text>uestionne : pose-toi des questions</Text>
        <Text style={styles.liste}>• <Text style={{fontWeight: 'bold'}}>L</Text>is : lis attentivement</Text>
        <Text style={styles.liste}>• <Text style={{fontWeight: 'bold'}}>R</Text>écite : raconte ce que tu as compris</Text>
        <Text style={styles.casUtilisation}>💡 Idéale pour : Traiter des textes longs, maîtriser une nouvelle matière, réviser structurément</Text>
        <Text style={styles.liste}>• <Text style={{fontWeight: 'bold'}}>R</Text>évise : reviens sur les points importants</Text>
      </Carte>

      <Carte>
        <Text style={styles.carteTitre}>💡 Bonus : Astuces Générales</Text>
        <Text style={styles.liste}>• Étudie dans un endroit calme et bien éclairé</Text>
        <Text style={styles.liste}>• Coupe tes notifications (utilisez Pomodoro)</Text>
        <Text style={styles.liste}>• Fais des pauses régulières (5 min toutes les 25 min)</Text>
        <Text style={styles.liste}>• Dors 7-8h : le sommeil consolide la mémoire</Text>
        <Text style={styles.liste}>• Enseigne à un(e) ami(e) pour vérifier ta compréhension</Text>
        <Text style={styles.casUtilisation}>💡 Conseil : Combine plusieurs méthodes pour trouver ta propre approche gagnante ! 🚀</Text>
      </Carte>
    </View>
  );
}

function Conseils() {
  return (
    <Carte>
      <Text style={styles.carteTitre}>💡 Conseils bien-être</Text>
      {[
        '😴 Dors 7 à 8h par nuit.',
        '💧 Bois de l\'eau régulièrement.',
        '🚶 Marche 10 min par jour.',
        '📵 Coupe les notifications pendant les révisions.',
        '🫂 Parle à quelqu\'un quand quelque chose te pèse.'
      ].map((texte) => (
        <Text key={texte} style={styles.liste}>{texte}</Text>
      ))}
    </Carte>
  );
}

function Urgence() {
  return (
    <Carte>
      <Text style={styles.urgenceTitre}>🆘 En cas d'urgence</Text>
      <Text style={styles.texte}>Si tu traverses une crise, n'attends pas :</Text>
      <Text style={styles.liste}>📞 SAMU : 185</Text>
      <Text style={styles.liste}>🚒 Sapeurs-Pompiers : 180</Text>
      <Text style={styles.liste}>💚 Assistance psychologique : 143</Text>
      <Text style={{marginTop: 12, fontWeight: 'bold', color: '#5C6B65'}}>🏛️ Services universitaires</Text>
      <Text style={styles.liste}>🏫 UFHB - CROU Abidjan 1 : <Text style={{color:'#2E7D64', fontWeight: 'bold'}}>25 21 00 98 33</Text></Text>
      <Text style={styles.liste}>🏫 UNA - CROU Abidjan 2 : <Text style={{color:'#2E7D64', fontWeight: 'bold'}}>27 24 32 48 37</Text></Text>
      <Text style={{fontSize: 11, color: '#5C6B65', marginTop: 8, fontStyle: 'italic'}}>
        📌 Ces numéros sont les standards des Centres Régionaux des Œuvres Universitaires (CROU)
      </Text>
    </Carte>
  );
}

function Button({ titre, onPress }) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{titre}</Text>
    </Pressable>
  );
}

// ========== STYLES ==========

const styles = StyleSheet.create({
  // Responsive constants
  safe: { flex: 1, backgroundColor: '#FAF8F3', paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight || 0 : 0 },
  flex: { flex: 1 },
  
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#2E7D64', fontSize: 16, marginTop: 12 },
  
  // ACCUEIL - Responsive
  accueil: { flexGrow: 1, justifyContent: 'flex-start', paddingHorizontal: '8%', paddingTop: 48, paddingBottom: 28, maxWidth: 600, alignSelf: 'center', width: '100%' },
  accueilCompact: { paddingHorizontal: 16, paddingTop: 36, paddingBottom: 22 },
  accueilShort: { paddingTop: 22, paddingBottom: 18 },
  logoImage: { width: 132, height: 132, alignSelf: 'center', marginBottom: 16, borderRadius: 66 },
  logoImageCompact: { width: 116, height: 116, borderRadius: 58 },
  logoImageShort: { width: 96, height: 96, borderRadius: 48, marginBottom: 10 },
  appName: { fontSize: 36, fontWeight: 'bold', textAlign: 'center', color: '#2E7D64', marginTop: 0 },
  appNameCompact: { fontSize: 30 },
  tagline: { textAlign: 'center', color: '#5C6B65', marginBottom: 34, marginTop: 8, fontSize: 16 },
  fieldLabel: { color: '#31443D', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  required: { color: '#C94D42' },
  optional: { color: '#5C6B65', fontWeight: '400' },
  
  input: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E3E9E6', color: '#243B33' },
  inputErreur: { borderColor: '#C94D42', borderWidth: 2 },
  erreurTexte: { color: '#C94D42', fontSize: 12, marginTop: -12, marginBottom: 12, paddingHorizontal: 4 },
  
  note: { color: '#5C6B65', fontSize: 12, marginLeft: 10, marginBottom: 8 },
  commencer: { backgroundColor: '#2E7D64', padding: 16, borderRadius: 14, marginTop: 24, shadowColor: '#2E7D64', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  disabled: { backgroundColor: '#B0C4C2' },
  commencerText: { color: '#FFF', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  noteBas: { textAlign: 'center', color: '#5C6B65', fontSize: 12, marginTop: 30, lineHeight: 18 },
  
  // HEADER - Responsive
  header: { backgroundColor: '#FFFEFA', paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#ECE5D9' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 0, maxWidth: 96 },
  burger: { backgroundColor: '#E8F3F0', padding: 10, borderRadius: 10 },
  headerBrand: { flex: 1 },
  headerTitle: { color: '#2E7D64', fontWeight: 'bold', fontSize: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusOnline: { backgroundColor: '#43A87C' },
  statusOffline: { backgroundColor: '#D98D57' },
  statusText: { color: '#7C9089', fontSize: 11 },
  quitter: { color: '#5C6B65', fontSize: 14 },
  
  // MESSAGES - Responsive
  messageScroll: { flex: 1 },
  messages: { paddingHorizontal: 12, paddingVertical: 16, flexGrow: 1, justifyContent: 'flex-end' },
  messagesWide: { width: '100%', maxWidth: 780, alignSelf: 'center' },
  ligne: { alignItems: 'flex-start', marginBottom: 10 },
  ligneMoi: { alignItems: 'flex-end' },
  bulle: { maxWidth: '85%', padding: 12, borderRadius: 16, lineHeight: 21, fontSize: 14, overflow: 'hidden' },
  bulleCompact: { maxWidth: '92%' },
  bulleWide: { maxWidth: '72%' },
  bulleMoi: { backgroundColor: '#2E7D64', color: '#FFF' },
  bulleBot: { backgroundColor: '#FFF', color: '#243B33', borderWidth: 1, borderColor: '#EFE8DC' },
  bulleUrgente: { backgroundColor: '#E8F3F0', color: '#244E40', borderWidth: 1, borderColor: '#B9DACE' },
  
  // COMPOSER - Responsive
  composer: { backgroundColor: '#FFFEFA', borderTopWidth: 1, borderTopColor: '#ECE5D9' },
  emotions: { paddingHorizontal: 12, paddingVertical: 6, gap: 6, alignItems: 'center' },
  chip: { flexGrow: 0, flexShrink: 0, backgroundColor: '#E8F3F0', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16 },
  chipText: { color: '#2E7D64', fontSize: 11, fontWeight: '600' },
  saisie: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 10, alignItems: 'flex-end', gap: 8 },
  saisieWide: { width: '100%', maxWidth: 780, alignSelf: 'center' },
  messageInput: { flex: 1, maxHeight: 100, backgroundColor: '#FAF8F3', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, lineHeight: 20, color: '#243B33', borderWidth: 1, borderColor: '#ECE5D9' },
  messageInputCompact: { maxHeight: 82, paddingHorizontal: 12 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2E7D64', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sendDisabled: { backgroundColor: '#B0C4C2' },
  sendText: { color: '#FFF', fontSize: 18 },
  stats: { textAlign: 'center', color: '#7C9089', fontSize: 11, paddingVertical: 6, borderTopWidth: 0.5, borderTopColor: '#E3E9E6' },
  
  // MENU - Responsive
  overlay: { flex: 1, backgroundColor: 'rgba(33,41,36,.38)', justifyContent: 'flex-start' },
  menu: { backgroundColor: '#243B33', width: '78%', maxWidth: 400, height: '100%', paddingTop: 56, paddingHorizontal: 16 },
  menuTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 18, marginBottom: 22 },
  menuSection: { color: '#7C9089', fontSize: 11, marginBottom: 8, marginTop: 12, fontWeight: '600', textTransform: 'uppercase' },
  menuItem: { flexDirection: 'row', gap: 12, paddingVertical: 13, alignItems: 'center' },
  menuEmoji: { fontSize: 18, minWidth: 24 },
  menuText: { color: '#E4EBE8', fontSize: 15, flex: 1 },
  urgence: { color: '#F3A08A', fontSize: 15 },
  menuBottom: { color: '#7C9089', fontSize: 11, marginTop: 'auto', marginBottom: 26 },
  
  // TOOLS/OUTIL - Responsive
  back: { color: '#2E7D64', fontSize: 24, padding: 8 },
  outil: { padding: 12, paddingBottom: 24, maxWidth: 900, alignSelf: 'center', width: '100%' },
  carte: { backgroundColor: '#FFFEFA', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EFE8DC', shadowColor: '#31443D', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  carteTitre: { color: '#2E7D64', fontWeight: 'bold', fontSize: 18, marginBottom: 12 },
  texte: { color: '#5C6B65', lineHeight: 22, marginBottom: 12, fontSize: 15 },
  dateHint: { color: '#5C6B65', fontSize: 13, marginTop: -10, marginBottom: 10, fontStyle: 'italic' },
  center: { textAlign: 'center', color: '#5C6B65', marginVertical: 10, fontSize: 15 },
  
  // TIMER & BUTTONS - Responsive
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  button: { backgroundColor: '#E8F3F0', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, alignSelf: 'flex-start' },
  buttonText: { color: '#2E7D64', fontWeight: '600', fontSize: 14 },
  
  // RESULTS - Responsive
  resultat: { backgroundColor: '#E8F3F0', padding: 14, borderRadius: 10, gap: 6, marginTop: 12, fontSize: 14 },
  avertissement: { color: '#5C6B65', fontSize: 12, marginTop: 12, fontStyle: 'italic' },
  
  // BREATHING - Responsive
  respiration: { paddingVertical: 28, paddingHorizontal: 20, borderRadius: 16, alignItems: 'center', marginBottom: 12, minHeight: 140, justifyContent: 'center' },
  respirationText: { color: '#2E7D64', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  
  // GAMES - Responsive
  gameTabsContainer: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  gameTab: { backgroundColor: '#E8F3F0', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, flexGrow: 1, flexBasis: '46%', minWidth: 118, maxWidth: 260 },
  gameTabActive: { backgroundColor: '#2E7D64' },
  gameTabText: { color: '#2E7D64', fontWeight: '600', textAlign: 'center', fontSize: 12 },
  gameTabActiveText: { color: '#FFF' },
  mathProblem: { color: '#2E7D64', fontWeight: 'bold', textAlign: 'center', fontSize: 32, marginVertical: 16, padding: 12, backgroundColor: '#E8F3F0', borderRadius: 10 },
  memoryGrid: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignSelf: 'center', width: '100%', maxWidth: 420, marginVertical: 12 },
  memoryCard: { width: '22%', minWidth: 56, maxWidth: 84, aspectRatio: 1, backgroundColor: '#2E7D64', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  memoryCardText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  memoryCardFound: { backgroundColor: '#E8F3F0', opacity: 0.5 },
  quizChoices: { gap: 10, marginVertical: 8 },
  quizChoice: { backgroundColor: '#F7F9F8', borderWidth: 1, borderColor: '#CFE2DA', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  quizChoiceText: { color: '#244E40', fontWeight: '600', textAlign: 'center' },
  winner: { textAlign: 'center', color: '#2E7D64', fontSize: 18, fontWeight: 'bold', marginTop: 12, padding: 12, backgroundColor: '#FFF9E6', borderRadius: 10, borderWidth: 2, borderColor: '#2E7D64' },
  casUtilisation: { marginTop: 10, padding: 10, backgroundColor: '#F0F7F5', borderLeftWidth: 3, borderLeftColor: '#2E7D64', color: '#2E7D64', fontSize: 13, fontWeight: '600', fontStyle: 'italic' },
  methodesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  methodeChip: { backgroundColor: '#E8F3F0', color: '#2E7D64', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, fontSize: 12, fontWeight: '600' },
  
  // Styles manquants
  liste: { color: '#5C6B65', fontSize: 14, marginBottom: 6, lineHeight: 20 },
  urgenceTitre: { color: '#C94D42', fontWeight: 'bold', fontSize: 18, marginBottom: 12 },
});
