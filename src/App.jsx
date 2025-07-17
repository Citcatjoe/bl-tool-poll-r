import { useState, useEffect } from 'react'; 
import './App.scss';
import BtnDownload from './components/BtnDownload/BtnDownload';
import LoadingOverlay from './components/LoadingOverlay/LoadingOverlay';
//import Calendar from './components/Calendar/Calendar';
import { fetchQuestionData } from './services/api';
import { dataLayerPushView, dataLayerPushSeeAllClick } from './services/analytics'; 
import { db } from './services/firebase'; // Importez votre instance Firebase
import { doc, updateDoc, arrayUnion, increment, getDoc } from 'firebase/firestore'; // Import des fonctions Firestore
import { CountUp } from 'countup.js';
import html2canvas from 'html2canvas';

function App() {
    const [docId, setDocId] = useState(null);
    const [question, setQuestion] = useState(null);
    const [hasAnswered, setHasAnswered] = useState(false); // Nouvel état pour empêcher plusieurs votes
    const [postMode, setPostMode] = useState(false);
    const [loading, setLoading] = useState(true); // Par défaut, l'overlay est visible
    
    // Mode développement : passer à true pour désactiver la protection localStorage
    const [isDev, setIsDev] = useState(false); // Passer à false en production

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const questionDoc = urlParams.get('questionDoc');

        if (!questionDoc) {
            console.log('Aucune question trouvée.');
            return;
        }

        async function loadQuestion() {
            try {
                const data = await fetchQuestionData(questionDoc);
                setQuestion(data);
                setDocId(questionDoc); // Stockez l'ID du document pour les mises à jour
                
                // Incrémenter le compteur de vues
                await incrementCounterViews(questionDoc);
                
                // Vérifier si l'utilisateur a déjà voté pour cette question (via localStorage)
                // Seulement si pas en mode développement
                if (!isDev) {
                    const hasVotedKey = `hasVoted_${questionDoc}`;
                    const hasVotedForThisQuestion = localStorage.getItem(hasVotedKey) === 'true';
                    
                    if (hasVotedForThisQuestion) {
                        setHasAnswered(true);
                        console.log('L\'utilisateur a déjà voté pour cette question.');
                        // Afficher directement les résultats puisque l'utilisateur a déjà voté
                        setTimeout(() => {
                            displayResults(data);
                        }, 100); // Petit délai pour s'assurer que le DOM est prêt
                    }
                }
            } catch (error) {
                console.error('Erreur lors du chargement de la question:', error);
            } finally {
                setLoading(false); // Masquer l'overlay une fois le chargement terminé
            }
        }

        loadQuestion();
    }, []);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const postModeParam = urlParams.get('postMode'); // Récupère la valeur du paramètre "postMode"

        // Définit le state postMode sur TRUE uniquement si le paramètre est présent et égal à "true"
        setPostMode(postModeParam === 'true');
        
        if (isDev) {
            console.log('🔧 Mode développement activé - Protection localStorage désactivée');
        }
    }, [isDev]);

    useEffect(() => {
        if (postMode && question) {
            displayResultsInPostMode(question); // Affiche les résultats sans animations
        }
    }, [postMode, question]);

    const calculateTotalVotes = (answers) => {
        if (!Array.isArray(answers)) return 0;
        return answers.reduce((total, answer) => total + (answer.answerCounter || 0), 0);
    };

    // Fonction pour incrémenter le compteur de vues
    const incrementCounterViews = async (questionDoc) => {
        if (!questionDoc) return;

        try {
            const questionRef = doc(db, 'embeds', questionDoc);
            await updateDoc(questionRef, {
                counterViews: increment(1)
            });
            console.log('Compteur de vues incrémenté');
        } catch (error) {
            console.error('Erreur lors de l\'incrémentation du compteur de vues:', error);
        }
    };

    const calculateRoundedPercentages = (answers) => {
        const totalVotes = calculateTotalVotes(answers);
        if (totalVotes === 0) {
            return answers.map(() => 0); // Si aucun vote, tous les pourcentages sont 0
        }

        // Calculer les pourcentages initiaux
        let rawPercentages = answers.map((answer) =>
            ((answer.answerCounter || 0) / totalVotes) * 100
        );

        // Arrondir les pourcentages
        let roundedPercentages = rawPercentages.map(Math.round);

        // Calculer la différence entre la somme des pourcentages arrondis et 100
        const difference = 100 - roundedPercentages.reduce((sum, p) => sum + p, 0);

        // Ajuster les pourcentages pour compenser la différence
        for (let i = 0; i < Math.abs(difference); i++) {
            const index = rawPercentages.findIndex((value, idx) =>
                difference > 0
                    ? roundedPercentages[idx] < Math.ceil(value) // Ajouter 1 si possible
                    : roundedPercentages[idx] > Math.floor(value) // Retirer 1 si possible
            );
            if (index !== -1) {
                roundedPercentages[index] += difference > 0 ? 1 : -1;
            }
        }

        return roundedPercentages;
    };

    const displayResults = (updatedQuestion) => {
        if (!document.querySelector('.App').classList.contains('voted')) {
            document.querySelector('.App').classList.add('voted');
        }
        const totalVotes = calculateTotalVotes(updatedQuestion.answers);

        document.querySelectorAll('.percent').forEach((el) => {
            el.style.display = 'flex';
        });

        document.querySelectorAll('.percent-value').forEach((el, index) => {
            const targetValue = Math.round(
                ((updatedQuestion.answers[index].answerCounter || 0) / totalVotes) * 100
            );
            const countUp = new CountUp(el, targetValue, { duration: 2 });
            if (!countUp.error) {
                countUp.start();
            } else {
                console.error(countUp.error);
            }
        });

        document.querySelectorAll('.bar-gauge').forEach((el, index) => {
            const targetWidth = `${Math.round(
            ((updatedQuestion.answers[index].answerCounter || 0) / totalVotes) * 100
            )}%`;
            el.style.transition = 'width 2s cubic-bezier(0.19, 1, 0.22, 1)';
            el.style.width = targetWidth;
        });

        // Find the index of the element with the highest width
        const maxIndex = updatedQuestion.answers.reduce((maxIdx, answer, idx, arr) => {
            return (arr[maxIdx].answerCounter || 0) < (answer.answerCounter || 0) ? idx : maxIdx;
        }, 0);

        // Update opacity for all .bar-gauge elements
        document.querySelectorAll('.bar-gauge').forEach((el, index) => {
            el.style.opacity = index === maxIndex ? '1' : '0.25';
        });

        document.querySelectorAll('.percent').forEach((el, index) => {
            el.style.opacity = index === maxIndex ? '1' : '0.25';
        });

        if (totalVotes >= 100) {
            document.getElementById('total-votes').style.opacity = '0.3';
            document.getElementById('total-votes-val').textContent = totalVotes;
        }

        console.log('Les résultats ont été mis à jour :', updatedQuestion.answers);
    };

    const displayResultsInPostMode = (updatedQuestion) => {
        if (!updatedQuestion || !updatedQuestion.answers) {
            console.error('Les données de la question sont invalides.');
            return;
        }

        const totalVotes = calculateTotalVotes(updatedQuestion.answers);

        document.querySelectorAll('.percent').forEach((el) => {
            el.style.display = 'flex';
        });

        // Met à jour les pourcentages directement sans animation
        document.querySelectorAll('.percent-value').forEach((el, index) => {
            const targetValue = Math.round(
                ((updatedQuestion.answers[index].answerCounter || 0) / totalVotes) * 100
            );
            el.textContent = targetValue; // Affiche directement la valeur
        });

        // Met à jour les barres de progression sans animation
        document.querySelectorAll('.bar-gauge').forEach((el, index) => {
            const targetWidth = `${Math.round(
                ((updatedQuestion.answers[index].answerCounter || 0) / totalVotes) * 100
            )}%`;
            el.style.width = targetWidth; // Définit directement la largeur
        });

        // Trouver l'index de l'élément avec le plus de votes
        const maxIndex = updatedQuestion.answers.reduce((maxIdx, answer, idx, arr) => {
            return (arr[maxIdx].answerCounter || 0) < (answer.answerCounter || 0) ? idx : maxIdx;
        }, 0);

        // Met à jour la couleur de fond pour tous les éléments .bar-gauge
        document.querySelectorAll('.bar-gauge').forEach((el, index) => {
            el.style.backgroundColor = index === maxIndex ? '' : '#FF8781'; // Couleur de base ou #FF8781
        });

        console.log('Les résultats pour le mode Post ont été affichés :', updatedQuestion.answers);
    };

    const handleAnswerClick = async (answerId) => {

        if (postMode) {
            console.log('Vote impossible en mode post.');
            return; // Empêche plusieurs votes
        }

        // Vérification si l'utilisateur a déjà voté dans cette session
        if (hasAnswered) {
            console.log('Vous avez déjà voté pour cette question.');
            return; // Empêche plusieurs votes
        }

        if (!docId) return;

        try {
            const questionRef = doc(db, 'embeds', docId); // Référence au document Firebase

            // Relire les données actuelles depuis Firestore
            const questionSnapshot = await getDoc(questionRef);
            if (!questionSnapshot.exists()) {
                console.error('Le document de la question est introuvable.');
                return;
            }

            const currentQuestion = questionSnapshot.data();
            const currentAnswers = currentQuestion.answers;

            if (!Array.isArray(currentAnswers)) {
                console.error('La structure des réponses est invalide.');
                return;
            }

            // Mettre à jour uniquement le champ answerCounter tout en conservant les autres champs
            const updatedAnswers = [...currentAnswers];
            updatedAnswers[answerId] = {
                ...updatedAnswers[answerId],
                answerCounter: (updatedAnswers[answerId].answerCounter || 0) + 1,
            };

            // Mettre à jour l'ensemble des réponses dans Firestore
            await updateDoc(questionRef, {
                answers: updatedAnswers, // Forcer la structure à rester un tableau
            });

            // Mettre à jour l'état local pour refléter les changements
            setQuestion((prevQuestion) => ({
                ...prevQuestion,
                answers: updatedAnswers,
            }));

            // Empêcher d'autres votes
            setHasAnswered(true);
            
            // Stocker dans localStorage seulement si pas en mode développement
            if (!isDev) {
                const hasVotedKey = `hasVoted_${docId}`;
                localStorage.setItem(hasVotedKey, 'true');
                console.log('Vote enregistré dans localStorage');
            } else {
                console.log('🔧 Mode dev : vote non enregistré dans localStorage');
            }

            // Appeler displayResults après la mise à jour
            displayResults({
                ...currentQuestion,
                answers: updatedAnswers,
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du document:', error);
        }
    };

    return (
        <div className={`App relative ${postMode ? 'post-mode' : ''}`}>
            {loading && <LoadingOverlay />}
            {postMode && <BtnDownload />}
            <span className="block w-full label1 mb-2">Donnez votre avis!</span>
            <span className="block antialiased w-full label2 mb-4">
                {question ? question.pollTxt : 'Chargement...'}
            </span>

            <ul id="answers">
                {question && question.answers ? (
                    (() => {
                        const roundedPercentages = calculateRoundedPercentages(question.answers);
                        return question.answers.map((answer, index) => {
                            const percent = Math.round(roundedPercentages[index]); // Arrondi à l'entier
                            return (
                                <li
                                    key={index}
                                    answer-id={`${index}`}
                                    className="answer flex gap-x-2 relative mb-0 cursor-pointer"
                                    onClick={() => handleAnswerClick(index)} // Appelle la fonction pour mettre à jour Firebase
                                >
                                    <span className="relative block bar flex-1 item-center bg-white rounded-md">
                                        {postMode && (
                                            <span className="absolute bar-gauge-bg left-0 right-0 block h-1 bottom-0 rounded-full"></span>
                                        )}
                                        <span className="absolute bar-gauge left-0 block h-1 bottom-0 rounded-full"></span>
                                        <p className="label3 left-4 w-10/12 pl-4">{answer.answerTxt}</p>
                                    </span>
                                    <span className="percent absolute right-4 top-1/2 -translate-y-1/2">
                                        <span className="percent-value">{percent}</span>% {/* Affiche le pourcentage entier */}
                                    </span>
                                </li>
                            );
                        });
                    })()
                ) : (
                    <li>Chargement des réponses...</li>
                )}
            </ul>
            <span id="total-votes" className="absolute text-xs left-1/2 -translate-x-1/2 bottom-3">
                <span id="total-votes-val"></span>
                <span id="total-votes-txt"> votes</span>
            </span>
        </div>
    );
}

export default App;
