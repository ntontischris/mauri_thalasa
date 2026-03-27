"use client";

import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FoodCostDashboard } from "@/components/pos/food-cost-dashboard";
import { RecipeCard } from "@/components/pos/recipe-card";
import { RecipeEditor } from "@/components/pos/recipe-editor";
import { useRecipes } from "@/hooks/use-recipes";
import type { Recipe } from "@/lib/types";

export default function RecipesPage() {
  const { recipes } = useRecipes();
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>(
    undefined,
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleNewRecipe = () => {
    setEditingRecipe(undefined);
    setIsEditorOpen(true);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsEditorOpen(true);
  };

  const handleEditorClose = (open: boolean) => {
    setIsEditorOpen(open);
    if (!open) setEditingRecipe(undefined);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Συνταγές &amp; Food Cost</h1>
        </div>
        <Button onClick={handleNewRecipe}>
          <Plus className="mr-2 h-4 w-4" />
          Νέα Συνταγή
        </Button>
      </div>

      {/* Dashboard */}
      <FoodCostDashboard />

      {/* Recipe grid */}
      {recipes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onEdit={handleEditRecipe}
            />
          ))}

          {/* Add new recipe card */}
          <Card
            className="flex cursor-pointer items-center justify-center border-dashed transition-colors hover:border-primary hover:bg-muted/50"
            onClick={handleNewRecipe}
          >
            <CardContent className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Plus className="h-8 w-8" />
              <span className="text-sm font-medium">Νέα Συνταγή</span>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-medium">Δεν υπάρχουν συνταγές</h3>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Δημιουργήστε τη πρώτη συνταγή για να παρακολουθείτε το food cost.
          </p>
          <Button onClick={handleNewRecipe}>
            <Plus className="mr-2 h-4 w-4" />
            Νέα Συνταγή
          </Button>
        </div>
      )}

      {/* Editor dialog */}
      <RecipeEditor
        recipe={editingRecipe}
        open={isEditorOpen}
        onOpenChange={handleEditorClose}
      />
    </div>
  );
}
