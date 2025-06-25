// onboarding.ts
import { onboardingQuestions } from './questions';
import { supabase } from './supabase'; // Import the centralized Supabase client

// Define a type for the user data fetched from Supabase
interface UserProfile {
  id: string;
  onboarding_step: number;
  onboarding_state: { [key: string]: any }; // Adjust this type if onboarding_state has a more strict structure
  onboarding_complete: boolean;
}

// Helper function to replace placeholders in question text
async function replacePlaceholders(chatId: string, text: string): Promise<string> {
  let processedText = text;

  if (processedText.includes('{{petName}}')) {
    try {
      // First, get the user's ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('chat_id', chatId)
        .single();

      if (userError || !userData) {
        console.error('Error fetching user ID for placeholder replacement:', userError);
        return processedText; // Return original text if user not found
      }

      // Then, get the pet's name using the user ID
      const { data: petData, error: petError } = await supabase
        .from('pets')
        .select('name')
        .eq('user_id', userData.id)
        .single();

      if (!petError && petData && petData.name) {
        processedText = processedText.replace(/{{petName}}/g, petData.name);
      } else {
        // If pet name not found yet, replace with a generic term or just remove placeholder
        processedText = processedText.replace(/{{petName}}/g, 'your pet');
      }
    } catch (error) {
      console.error('Error during placeholder replacement:', error);
      processedText = processedText.replace(/{{petName}}/g, 'your pet'); // Fallback in case of error
    }
  }

  return processedText;
}


export async function handleOnboarding(chatId: string, message: string): Promise<string> {
  try {
    let { data: user, error } = await supabase
      .from('users')
      .select('id, onboarding_step, onboarding_state, onboarding_complete') // Ensure onboarding_complete is selected
      .eq('chat_id', chatId)
      .single();

    if (error && error.code === 'PGRST116') {
      // User not found, create new user and start onboarding from step 0
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{ chat_id: chatId, onboarding_step: 0, onboarding_complete: false, onboarding_state: {} }])
        .select('id, onboarding_step, onboarding_state, onboarding_complete') // Ensure onboarding_complete is selected here too
        .single();

      if (createError || !newUser) {
        console.error('Error creating new user:', createError);
        return 'I had trouble setting you up. Please try again.';
      }
      user = newUser as UserProfile; // Cast to UserProfile type
    } else if (error) {
      console.error('Error fetching user:', error);
      return 'An error occurred while checking your status.';
    }

    // Ensure 'user' is treated as UserProfile after initial fetch or creation
    const currentUser = user as UserProfile;

    let currentStep = currentUser.onboarding_step || 0;
    let onboardingState = currentUser.onboarding_state || {};
    let reply = '';
    let onboardingComplete = currentUser.onboarding_complete || false; // Use the value from DB

    // Process the user's message for the current step
    const currentQuestion = onboardingQuestions[currentStep];

    if (currentQuestion) {
      switch (currentQuestion.field) {
        case 'name':
          if (message.toLowerCase() === '/start' && currentStep === 0) {
            // Allow /start to re-initiate if they are at step 0
            onboardingState = {}; // Reset state if starting over
            reply = await replacePlaceholders(chatId, currentQuestion.text);
          } else if (message.trim()) {
            onboardingState.name = message.trim();
            reply = `Nice to meet you, ${onboardingState.name}!`;
            currentStep++;
          } else {
            reply = "Please tell me your name so we can get started!";
          }
          break;
        case 'petName':
          if (message.trim()) {
            onboardingState.petName = message.trim();
            // Create or update pet entry with user_id later
            reply = await replacePlaceholders(chatId, `What type of pet is {{petName}}? (e.g., Dog, Cat, Bird, etc.)`);
            currentStep++;
          } else {
            reply = "Please tell me your pet's name!";
          }
          break;
        case 'petType':
          if (message.trim()) {
            onboardingState.petType = message.trim();
            reply = await replacePlaceholders(chatId, `Do you know {{petName}}'s breed? If not, no worries!`);
            currentStep++;
          } else {
            reply = "Please tell me your pet's type!";
          }
          break;
        case 'petBreed':
          onboardingState.petBreed = message.trim() || null; // Allow empty for no breed
          reply = await replacePlaceholders(chatId, `What is {{petName}}'s date of birth? (YYYY-MM-DD, or 'unknown' if you don't know)`);
          currentStep++;
          break;
        case 'petDob':
          if (message.trim().toLowerCase() === 'unknown' || /^\d{4}-\d{2}-\d{2}$/.test(message.trim())) {
            onboardingState.petDob = message.trim().toLowerCase() === 'unknown' ? null : message.trim();
            reply = await replacePlaceholders(chatId, `Awesome! Just a few questions about {{petName}}'s preferences. For example, "likes chicken, allergic to beef, needs daily walks".`);
            currentStep++;
          } else {
            reply = "Please use YYYY-MM-DD format or type 'unknown'.";
          }
          break;
        case 'petPreferences':
          onboardingState.petPreferences = message.trim();
          reply = await replacePlaceholders(chatId, `Got it! We're all set for {{petName}}. I'll start looking after your pet!`);
          onboardingComplete = true; // Mark onboarding as complete after this step
          currentStep++; // Move past the last question index
          break;
        default:
          reply = "I'm not sure how to process that. Let's try again.";
          break;
      }
    } else if (currentStep >= onboardingQuestions.length && !currentUser.onboarding_complete) {
      // User has completed all questions, finalize onboarding
      onboardingComplete = true;
      reply = "Welcome aboard! How can I help you manage your pet's life today?";
    } else {
      // Should not happen if logic is correct, implies user is beyond known questions but not marked complete
      reply = "It seems you've completed onboarding. How can I assist you?";
      onboardingComplete = true;
    }

    // Save current onboarding state and step
    const { error: updateError } = await supabase
      .from('users')
      .update({
        onboarding_step: currentStep,
        onboarding_state: onboardingState,
        onboarding_complete: onboardingComplete
      })
      .eq('chat_id', chatId);

    if (updateError) {
      console.error('Error updating user onboarding state:', updateError);
      return 'An error occurred while saving your progress. Please try again.';
    }

    // If onboarding is complete, save or update the pet details
    if (onboardingComplete) {
      // Check if a pet already exists for this user to avoid duplicates on re-completion
      const { data: existingPet, error: petFetchError } = await supabase
        .from('pets')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (petFetchError && petFetchError.code !== 'PGRST116') { // PGRST116 means no pet found, which is fine
        console.error('Error checking for existing pet:', petFetchError);
        // Continue without saving pet to avoid blocking, user can retry
      } else if (!existingPet) { // If no existing pet, insert new one
        const { error: petInsertError } = await supabase
          .from('pets')
          .insert([
            {
              user_id: currentUser.id,
              name: onboardingState.petName,
              type: onboardingState.petType,
              breed: onboardingState.petBreed,
              dob: onboardingState.petDob,
              preferences: onboardingState.petPreferences ? { description: onboardingState.petPreferences } : {},
            },
          ]);

        if (petInsertError) {
          console.error('Error inserting pet details:', petInsertError);
          // Return a user-friendly error, but don't prevent bot from being complete
        }
      } else { // If pet exists, update it
         const { error: petUpdateError } = await supabase
          .from('pets')
          .update({
            name: onboardingState.petName,
            type: onboardingState.petType,
            breed: onboardingState.petBreed,
            dob: onboardingState.petDob,
            preferences: onboardingState.petPreferences ? { description: onboardingState.petPreferences } : {},
          })
          .eq('id', existingPet.id);
        
        if (petUpdateError) {
          console.error('Error updating pet details:', petUpdateError);
        }
      }
    }

    // If there's a next question, prepare it for display, applying placeholders
    if (!onboardingComplete && currentStep < onboardingQuestions.length) {
      const nextQuestion = onboardingQuestions[currentStep];
      reply = await replacePlaceholders(chatId, nextQuestion.text);
    } else if (onboardingComplete && reply === '') {
        // Fallback for cases where onboarding just completed and no specific final reply was set
        reply = "Welcome aboard! How can I help you manage your pet's life today?";
    }


    return reply;

  } catch (error) {
    console.error('General error in handleOnboarding:', error);
    return 'An unexpected error occurred during onboarding. Please try again later.';
  }
}