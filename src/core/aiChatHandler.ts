// aiChatHandler.ts (add these console.time lines)
import axios from 'axios';
import { supabase } from './supabase';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY as string;

export async function getCompletion(chatId: string, messageText: string): Promise<string> {
  try {
    console.time('AI_Handler_Total'); // Start total timer

    console.time('Supabase_Fetch_UserPet'); // Start Supabase fetch timer
    // Fetch user and pet data for context (memory of preferences, routines)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('chat_id', chatId)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user for AI chat handler:', userError);
      return "I can't seem to find your user profile to get your pet's preferences. Please try again.";
    }

    const userId = userData.id;

    const { data: petData, error: petError } = await supabase
      .from('pets')
      .select('name, type, breed, dob, preferences')
      .eq('user_id', userId)
      .single();

    if (petError || !petData) {
      console.error('Error fetching pet data for AI chat handler:', petError);
      return "I can't seem to find your pet's details to provide personalized assistance. Please ensure pet onboarding is complete.";
    }
    console.timeEnd('Supabase_Fetch_UserPet'); // End Supabase fetch timer

    const { name, type, breed, dob, preferences } = petData;
    const petInfo = `Pet Name: ${name}, Type: ${type}, Breed: ${breed || 'N/A'}, Age/DOB: ${dob || 'N/A'}`;
    const petPreferences = preferences ? JSON.stringify(preferences) : 'No specific preferences recorded.';

    const systemMessage = `You are a helpful and proactive Pet Butler AI. Your primary goal is to assist pet owners by monitoring pet food, routines, and proactively sending reminders and suggestions. You have memory of pet preferences and routines.
    Here is the information about the user's pet:
    ${petInfo}
    Pet Preferences & Routines: ${petPreferences}
    
    Handle requests related to:
    - Auto food reorder reminders (provide product links if appropriate).
    - Vet/spa auto-reminder + booking simulation.
    - Proactive messages like "Mochi hasn't walked today" or "Time for grooming?".
    - General pet care advice based on the provided preferences.
    - Always maintain a friendly and helpful tone.
    - If a request involves reordering or booking, simulate the action and inform the user, e.g., "I've simulated a reorder reminder for [product]." or "I've simulated a booking for [service]."
    `;

    const messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: messageText },
    ];

    console.time('OpenRouter_API_Call'); // Start API call timer
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'x-ai/grok-3-mini', // Or the corrected model name you are using
        messages: messages,
        max_tokens: 1500
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );
    console.timeEnd('OpenRouter_API_Call'); // End API call timer


    if (response.data && response.data.choices && response.data.choices.length > 0) {
      console.timeEnd('AI_Handler_Total'); // End total timer before returning success
      return response.data.choices[0].message.content;
    } else {
      // console.error('AI response was empty or malformed:', response.data);
      console.timeEnd('AI_Handler_Total'); // End total timer before returning error
      return "I'm sorry, I couldn't get a response from the AI at this moment.";
    }
  } catch (error: any) {
    console.error('Full error object from AI API call:', error);
    console.error('Error response data (if any):', error.response?.data);
    console.error('Error message:', error.message);
    console.timeEnd('AI_Handler_Total'); // End total timer before returning error
    return 'I am currently having trouble communicating with the AI. Please try again shortly.';
  }
}