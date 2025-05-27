import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import Header from "@/components/header";
import type { Apartment } from "@shared/schema";

interface ApartmentFormData {
  roomNumber: string;
  title: string;
  description: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  imageUrl: string;
  images: string;
  videoUrl: string;
  amenities: string;
}

export default function Admin() {
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editData, setEditData] = useState<ApartmentFormData>({
    roomNumber: "",
    title: "",
    description: "",
    price: "",
    bedrooms: "",
    bathrooms: "",
    squareFeet: "",
    imageUrl: "",
    images: "",
    videoUrl: "",
    amenities: "",
  });
  const { toast } = useToast();

  const { data: apartments = [], isLoading } = useQuery<Apartment[]>({
    queryKey: ["/api/apartments"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      const response = await fetch(`/api/apartments/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.updates),
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apartments"] });
      setIsEditing(null);
      resetForm();
      toast({
        title: "Success!",
        description: "Apartment updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update apartment.",
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/apartments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apartments"] });
      setIsAdding(false);
      resetForm();
      toast({
        title: "Success!",
        description: "New apartment added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add apartment.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/apartments/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apartments"] });
      toast({
        title: "Success!",
        description: "Apartment deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete apartment.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setEditData({
      roomNumber: "",
      title: "",
      description: "",
      price: "",
      bedrooms: "",
      bathrooms: "",
      squareFeet: "",
      imageUrl: "",
      images: "",
      videoUrl: "",
      amenities: "",
    });
  };

  const handleEdit = (apartment: Apartment) => {
    setIsEditing(apartment.id);
    setEditData({
      roomNumber: apartment.roomNumber,
      title: apartment.title,
      description: apartment.description,
      price: apartment.price.toString(),
      bedrooms: apartment.bedrooms.toString(),
      bathrooms: apartment.bathrooms?.toString() || "1",
      squareFeet: apartment.squareFeet?.toString() || "650",
      imageUrl: apartment.imageUrl,
      amenities: apartment.amenities ? apartment.amenities.join(", ") : "",
    });
  };

  const handleSave = (id?: number) => {
    const amenitiesArray = editData.amenities 
      ? editData.amenities.split(",").map((a: string) => a.trim()).filter((a: string) => a)
      : [];

    const apartmentData = {
      roomNumber: editData.roomNumber,
      title: editData.title,
      description: editData.description,
      price: Number(editData.price),
      bedrooms: Number(editData.bedrooms),
      bathrooms: Number(editData.bathrooms),
      squareFeet: Number(editData.squareFeet),
      imageUrl: editData.imageUrl,
      amenities: amenitiesArray,
    };

    if (id) {
      updateMutation.mutate({ id, updates: apartmentData });
    } else {
      createMutation.mutate(apartmentData);
    }
  };

  const handleCancel = () => {
    setIsEditing(null);
    setIsAdding(false);
    resetForm();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading apartments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Apartment Management</h1>
          <Button
            onClick={() => setIsAdding(true)}
            className="bg-brand-coral hover:bg-red-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Apartment
          </Button>
        </div>

        <div className="grid gap-6">
          {apartments.map((apartment) => (
            <Card key={apartment.id} className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{apartment.title} - Room {apartment.roomNumber}</span>
                  <div className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(apartment)}
                      disabled={isEditing === apartment.id}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(apartment.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing === apartment.id ? (
                  <EditForm
                    data={editData}
                    onChange={setEditData}
                    onSave={() => handleSave(apartment.id)}
                    onCancel={handleCancel}
                    isLoading={updateMutation.isPending}
                  />
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">{apartment.description}</p>
                      <p className="font-semibold text-lg text-brand-coral">${apartment.price}/night</p>
                      <p className="text-sm">
                        {apartment.bedrooms} bed • {apartment.bathrooms || 1} bath • {apartment.squareFeet || 650} sq ft
                      </p>
                      {apartment.amenities && apartment.amenities.length > 0 && (
                        <p className="text-sm mt-2">
                          <strong>Amenities:</strong> {apartment.amenities.join(", ")}
                        </p>
                      )}
                    </div>
                    {apartment.imageUrl && (
                      <div className="flex justify-end">
                        <img
                          src={apartment.imageUrl}
                          alt={apartment.title}
                          className="w-32 h-24 object-cover rounded"
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Apartment</DialogTitle>
            </DialogHeader>
            <EditForm
              data={editData}
              onChange={setEditData}
              onSave={() => handleSave()}
              onCancel={handleCancel}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface EditFormProps {
  data: ApartmentFormData;
  onChange: (data: ApartmentFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function EditForm({ data, onChange, onSave, onCancel, isLoading }: EditFormProps) {
  const handleChange = (field: keyof ApartmentFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="roomNumber">Room Number</Label>
          <Input
            id="roomNumber"
            value={data.roomNumber}
            onChange={(e) => handleChange("roomNumber", e.target.value)}
            placeholder="714"
          />
        </div>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={data.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Luxury Studio Apartment"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Beautiful apartment with modern amenities..."
          rows={3}
        />
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="price">Price per night</Label>
          <Input
            id="price"
            type="number"
            value={data.price}
            onChange={(e) => handleChange("price", e.target.value)}
            placeholder="120"
          />
        </div>
        <div>
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input
            id="bedrooms"
            type="number"
            value={data.bedrooms}
            onChange={(e) => handleChange("bedrooms", e.target.value)}
            placeholder="1"
          />
        </div>
        <div>
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Input
            id="bathrooms"
            type="number"
            value={data.bathrooms}
            onChange={(e) => handleChange("bathrooms", e.target.value)}
            placeholder="1"
          />
        </div>
        <div>
          <Label htmlFor="squareFeet">Square Feet</Label>
          <Input
            id="squareFeet"
            type="number"
            value={data.squareFeet}
            onChange={(e) => handleChange("squareFeet", e.target.value)}
            placeholder="650"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="imageUrl">Image URL</Label>
        <Input
          id="imageUrl"
          value={data.imageUrl}
          onChange={(e) => handleChange("imageUrl", e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div>
        <Label htmlFor="amenities">Amenities (comma-separated)</Label>
        <Input
          id="amenities"
          value={data.amenities}
          onChange={(e) => handleChange("amenities", e.target.value)}
          placeholder="WiFi, Kitchen, Laundry, Parking"
        />
      </div>

      <div className="flex space-x-2 pt-4">
        <Button
          onClick={onSave}
          className="bg-brand-coral hover:bg-red-600"
          disabled={isLoading}
        >
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "Saving..." : "Save"}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}