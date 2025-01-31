<template>
<div>
    <!-- Calendar Header -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">Kalender</h2>
    </div>

    <!-- Calendar Container -->
    <div :class="['grid gap-4', isSmallScreen ? 'grid-cols-1' : 'grid-cols-7']">
      <!-- Loop through all days -->
      <div
        v-for="day in calendarDays"
        :key="day.date"
        class="border rounded-md p-4 bg-gray-50 shadow-md"
      >
        <!-- Date Header -->
        <h3 class="text-md font-semibold mb-2">{{ day.date }}</h3>

        <!-- Meals for the day -->
        <div v-if="day.meals.length > 0">
          <div v-for="meal in day.meals" :key="meal.id" class="mb-4">
            <h4 class="text-sm font-medium">{{ meal.name }}</h4>
            <p class="text-xs text-gray-600">{{ meal.description }}</p>

            <!-- Checkboxes -->
            <div class="mt-2">
              <label class="block text-xs font-medium mb-1">
                <input
                  type="checkbox"
                  v-model="meal.selected"
                  :true-value="1"
                  :false-value="0"
                  class="mr-2"
                />
                Deltager
              </label>
            </div>
            <div class="mt-2">
              <label class="block text-xs font-medium mb-1">
                <input
                  type="checkbox"
                  v-model="meal.takeawaySelected"
                  :true-value="1"
                  :false-value="0"
                  class="mr-2"
                />
                Take Away
              </label>
            </div>
          </div>
        </div>

        <!-- No events message -->
        <div v-else>
          <p class="text-xs text-gray-500 italic">No events for this day</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";

export default {
  data() {
    return {
      // Meal data
      
sampleItems: [
{
    id: 1,
    name: "Vegetarisk Pasta",
    type: "vegetarisk",
    description: "En lækker vegetarisk pasta med tomatsauce og friske urter.",
    datetime: "2024-08-30T18:30",
    user_id: null,
    price: 75,
    meal_id: 1,
    attendees: 2,
    total_allergies: 2,
    egg_allergies: 1,
    gluten_allergies: 2,
    lactose_allergies: 1,
    selected: 1,
    takeawaySelected: 0,
  },
  {
    id: 2,
    name: "Vegansk Salat",
    type: "vegansk",
    description: "En sund vegansk salat med blandede grønne blade og nødder.",
    datetime: "2024-08-30T18:30",
    user_id: null,
    price: 65,
    meal_id: 2,
    attendees: 2,
    total_allergies: 2,
    egg_allergies: 0,
    gluten_allergies: 1,
    lactose_allergies: 0,
    selected: 1,
    takeawaySelected: 0,
  },
  {
    id: 3,
    name: "Kylling i Karry",
    type: "ikke-vegetarisk",
    description: "En krydret kyllingeret med karry og ris.",
    datetime: "2024-08-30T18:30",
    user_id: null,
    price: 85,
    meal_id: 3,
    attendees: 3,
    total_allergies: 1,
    egg_allergies: 0,
    gluten_allergies: 0,
    lactose_allergies: 1,
    selected: 1,
    takeawaySelected: 1,
  },
  {
    id: 4,
    name: "Glutenfri Pizza",
    type: "glutenfri",
    description: "En glutenfri pizza med ost, tomat og friske grøntsager.",
    datetime: "2024-08-30T18:30",
    user_id: null,
    price: 90,
    meal_id: 4,
    attendees: 1,
    total_allergies: 1,
    egg_allergies: 0,
    gluten_allergies: 1,
    lactose_allergies: 1,
    selected: 1,
    takeawaySelected: 1,
  },
  {
    id: 5,
    name: "Risret med Taffel",
    type: "vegetarisk",
    description: "En smagfuld risret med grøntsager og krydret topping.",
    datetime: "2024-08-30T18:30",
    user_id: null,
    price: 70,
    meal_id: 5,
    attendees: 2,
    total_allergies: 2,
    egg_allergies: 1,
    gluten_allergies: 0,
    lactose_allergies: 1,
    selected: 1,
    takeawaySelected: 0,
  },
  {
    id: 6,
    name: "Stegt Ris med Grøntsager",
    type: "vegansk",
    description: "Stegte ris med sæsonens grøntsager og asiatisk inspiration.",
    datetime: "2024-08-10T18:30",
    user_id: 3,
    price: 85,
    meal_id: 6,
    attendees: 3,
    total_allergies: 2,
    egg_allergies: 0,
    gluten_allergies: 1,
    lactose_allergies: 0,
    selected: 1,
    takeawaySelected: 1,
  },
  {
    id: 7,
    name: "Klassisk Pasta",
    type: "ikke-vegetarisk",
    description: "En klassisk pasta med kødsauce og parmesanost.",
    datetime: "2025-01-03T18:30",
    user_id: 3,
    price: 95,
    meal_id: 7,
    attendees: 4,
    total_allergies: 1,
    egg_allergies: 1,
    gluten_allergies: 1,
    lactose_allergies: 1,
    selected: 1,
    takeawaySelected: 0,
  },
  {
    id: 8,
    name: "Risengrød",
    type: "vegetarisk",
    description: "En traditionel dansk risengrød med kanel og smør.",
    datetime: "2025-01-04T13:18",
    user_id: 3,
    price: 45,
    meal_id: 8,
    attendees: 2,
    total_allergies: 0,
    egg_allergies: 0,
    gluten_allergies: 0,
    lactose_allergies: 1,
    selected: 1,
    takeawaySelected: 0,
  },
  {
    id: 9,
    name: "Tofu i Kokoskarry",
    type: "vegansk",
    description: "Tofu tilberedt i en lækker kokoskarry med ris.",
    datetime: "2025-01-06T13:18",
    user_id: 3,
    price: 80,
    meal_id: 9,
    attendees: 3,
    total_allergies: 1,
    egg_allergies: 0,
    gluten_allergies: 1,
    lactose_allergies: 0,
    selected: 1,
    takeawaySelected: 1,
  },
  {
    id: 11,
    name: "Æblekage",
    type: "dessert",
    description: "Traditionel dansk æblekage med flødeskum.",
    datetime: "2024-01-02T14:00",
    user_id: 3,
    price: 40,
    meal_id: 11,
    attendees: 2,
    total_allergies: 0,
    egg_allergies: 1,
    gluten_allergies: 0,
    lactose_allergies: 1,
    selected: 0,
    takeawaySelected: 0,
  },
      ],
      // Media query to check screen size
      isSmallScreen: window.innerWidth < 768,
    };
  },
  computed: {
    calendarDays() {
      // Determine the start and end of the current month
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());

      // Create an array of all days in the current month
      const days = eachDayOfInterval({ start, end }).map((date) => ({
        date: format(date, "yyyy-MM-dd"), // Format the date
        meals: [],
      }));

      // Map meals to their corresponding days
      this.sampleItems.forEach((meal) => {
        const mealDate = meal.datetime.split("T")[0];
        const day = days.find((d) => d.date === mealDate);
        if (day) {
          day.meals.push(meal);
        }
      });

      return days;
    },
  },
  mounted() {
    // Add a resize listener to update `isSmallScreen`
    window.addEventListener("resize", this.updateScreenSize);
  },
  beforeDestroy() {
    // Remove the resize listener
    window.removeEventListener("resize", this.updateScreenSize);
  },
  methods: {
    updateScreenSize() {
      this.isSmallScreen = window.innerWidth < 768;
    },
  },
};
</script>

<style scoped>
/* Add additional styles as needed */
.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.grid-cols-7 {
  grid-template-columns: repeat(7, minmax(0, 1fr));
}
</style>