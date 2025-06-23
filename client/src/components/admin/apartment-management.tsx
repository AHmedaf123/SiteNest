import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Save, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import DraggableImageGrid from "@/components/ui/draggable-image-grid";
import type { Apartment } from "@shared/schema";

interface ApartmentFormData {
  roomNumber: string;
  title: string;
  description: string;
  price: string;
  discountPercentage: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  amenities: string;
  uploadedFiles: File[];
  uploadedFileUrls: string[];
  mainImageIndex: number;
}

export default function ApartmentManagement() {
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editData, setEditData] = useState<ApartmentFormData>({
    roomNumber: "",
    title: "",
    description: "",
    price: "",
    discountPercentage: "0",
    bedrooms: "",
    bathrooms: "",
    squareFeet: "",
    amenities: "",
    uploadedFiles: [],
    uploadedFileUrls: [],
    mainImageIndex: 0,
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

  const uploadFilesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/apartments/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload files');
      return response.json();
    },
    onSuccess: (data) => {
      setEditData(prev => ({
        ...prev,
        uploadedFileUrls: [...prev.uploadedFileUrls, ...data.fileUrls],
        uploadedFiles: []
      }));
      toast({
        title: "Success!",
        description: `${data.fileUrls.length} files uploaded successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload files.",
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
      discountPercentage: "0",
      bedrooms: "",
      bathrooms: "",
      squareFeet: "",
      amenities: "",
      uploadedFiles: [],
      uploadedFileUrls: [],
      mainImageIndex: 0,
    });
  };

  const handleEdit = (apartment: Apartment) => {
    setIsEditing(apartment.id);
    const existingImages = apartment.images || [];
    setEditData({
      roomNumber: apartment.roomNumber,
      title: apartment.title,
      description: apartment.description,
      price: apartment.price.toString(),
      discountPercentage: apartment.discountPercentage?.toString() || "0",
      bedrooms: apartment.bedrooms.toString(),
      bathrooms: apartment.bathrooms?.toString() || "1",
      squareFeet: apartment.squareFeet?.toString() || "650",
      amenities: apartment.amenities ? apartment.amenities.join(", ") : "",
      uploadedFiles: [],
      uploadedFileUrls: existingImages,
      mainImageIndex: 0,
    });
  };

  const handleSave = (id?: number) => {
    const amenitiesArray = editData.amenities
      ? editData.amenities.split(",").map((a: string) => a.trim()).filter((a: string) => a)
      : [];

    const allImages = editData.uploadedFileUrls.filter(Boolean);
    const validMainIndex = Math.max(0, Math.min(editData.mainImageIndex, allImages.length - 1));
    const mainImageUrl = allImages[validMainIndex] || "";

    const apartmentData = {
      roomNumber: editData.roomNumber,
      title: editData.title,
      description: editData.description,
      price: Number(editData.price),
      discountPercentage: Number(editData.discountPercentage) || 0,
      bedrooms: Number(editData.bedrooms),
      bathrooms: Number(editData.bathrooms),
      squareFeet: Number(editData.squareFeet),
      imageUrl: mainImageUrl,
      images: allImages,
      videoUrl: null,
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
    return <div className="text-center py-8">Loading apartments...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Apartment Listings</h2>
          <p className="text-gray-600">Manage your apartment listings with full CRUD operations</p>
        </div>
        <Button
          onClick={() => setIsAdding(true)}
          className="bg-brand-coral hover:bg-red-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Apartment
        </Button>
      </div>

      {/* Apartment List */}
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
                  onUploadFiles={(files) => uploadFilesMutation.mutate(files)}
                  isUploading={uploadFilesMutation.isPending}
                />
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{apartment.description}</p>
                    <div className="flex items-center space-x-2 mb-2">
                      {apartment.discountPercentage && apartment.discountPercentage > 0 ? (
                        <>
                          <span className="font-semibold text-lg text-brand-coral">
                            PKR {Math.round(apartment.price * (1 - apartment.discountPercentage / 100)).toLocaleString()}/night
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            PKR {apartment.price.toLocaleString()}
                          </span>
                          <Badge className="bg-red-500 text-white text-xs">
                            {apartment.discountPercentage}% OFF
                          </Badge>
                        </>
                      ) : (
                        <span className="font-semibold text-lg text-brand-coral">PKR {apartment.price.toLocaleString()}/night</span>
                      )}
                    </div>
                    <p className="text-sm">
                      {apartment.bedrooms} bed • {apartment.bathrooms || 1} bath • {apartment.squareFeet || 650} sq ft
                    </p>
                    {apartment.amenities && apartment.amenities.length > 0 && (
                      <p className="text-sm mt-2">
                        <strong>Amenities:</strong> {apartment.amenities.join(", ")}
                      </p>
                    )}
                    {apartment.images && apartment.images.length > 0 && (
                      <p className="text-sm mt-1 text-blue-600">
                        <strong>Images:</strong> {apartment.images.length + 1} total
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

      {/* Add Dialog */}
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
            onUploadFiles={(files) => uploadFilesMutation.mutate(files)}
            isUploading={uploadFilesMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EditFormProps {
  data: ApartmentFormData;
  onChange: (data: ApartmentFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
  onUploadFiles?: (files: File[]) => void;
  isUploading?: boolean;
}

function EditForm({ data, onChange, onSave, onCancel, isLoading, onUploadFiles, isUploading }: EditFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof ApartmentFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onChange({ ...data, uploadedFiles: [...data.uploadedFiles, ...files] });
  };

  const removeUploadedFile = (index: number) => {
    const newFiles = data.uploadedFiles.filter((_, i) => i !== index);
    onChange({ ...data, uploadedFiles: newFiles });
  };

  const removeUploadedUrl = (index: number) => {
    const newUrls = data.uploadedFileUrls.filter((_, i) => i !== index);
    let newMainIndex = data.mainImageIndex;

    if (index === data.mainImageIndex) {
      newMainIndex = 0;
    } else if (index < data.mainImageIndex) {
      newMainIndex = data.mainImageIndex - 1;
    }

    newMainIndex = Math.max(0, Math.min(newMainIndex, newUrls.length - 1));

    onChange({
      ...data,
      uploadedFileUrls: newUrls,
      mainImageIndex: newUrls.length > 0 ? newMainIndex : 0
    });
  };

  const handleImageReorder = (newImages: string[]) => {
    // Find the current main image URL
    const currentMainImageUrl = data.uploadedFileUrls[data.mainImageIndex];
    // Find its new index in the reordered array
    const newMainIndex = newImages.findIndex(url => url === currentMainImageUrl);

    onChange({
      ...data,
      uploadedFileUrls: newImages,
      mainImageIndex: Math.max(0, newMainIndex)
    });
  };

  const handleSetMainImage = (index: number) => {
    onChange({
      ...data,
      mainImageIndex: index
    });
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
            placeholder="e.g., 101"
          />
        </div>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={data.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="e.g., Luxury Studio Apartment"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Describe the apartment..."
          rows={3}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="price">Price (PKR/night)</Label>
          <Input
            id="price"
            type="number"
            value={data.price}
            onChange={(e) => handleChange("price", e.target.value)}
            placeholder="e.g., 15000"
          />
        </div>
        <div>
          <Label htmlFor="discountPercentage">Discount %</Label>
          <Input
            id="discountPercentage"
            type="number"
            value={data.discountPercentage}
            onChange={(e) => handleChange("discountPercentage", e.target.value)}
            placeholder="e.g., 10"
            min="0"
            max="100"
          />
        </div>
        <div>
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input
            id="bedrooms"
            type="number"
            value={data.bedrooms}
            onChange={(e) => handleChange("bedrooms", e.target.value)}
            placeholder="e.g., 2"
            min="1"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Input
            id="bathrooms"
            type="number"
            value={data.bathrooms}
            onChange={(e) => handleChange("bathrooms", e.target.value)}
            placeholder="e.g., 1"
            min="1"
          />
        </div>
        <div>
          <Label htmlFor="squareFeet">Square Feet</Label>
          <Input
            id="squareFeet"
            type="number"
            value={data.squareFeet}
            onChange={(e) => handleChange("squareFeet", e.target.value)}
            placeholder="e.g., 650"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="amenities">Amenities (comma-separated)</Label>
        <Input
          id="amenities"
          value={data.amenities}
          onChange={(e) => handleChange("amenities", e.target.value)}
          placeholder="e.g., WiFi, AC, Kitchen, Parking"
        />
      </div>

      {/* File Upload Section */}
      <div>
        <Label>Images</Label>
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? "Uploading..." : "Select Images"}
          </Button>

          {/* Selected Files */}
          {data.uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Selected Files:</p>
              {data.uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{file.name}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => removeUploadedFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {onUploadFiles && (
                <Button
                  type="button"
                  onClick={() => onUploadFiles(data.uploadedFiles)}
                  disabled={isUploading}
                  className="w-full"
                >
                  {isUploading ? "Uploading..." : "Upload Files"}
                </Button>
              )}
            </div>
          )}

          {/* Draggable Image Grid */}
          <DraggableImageGrid
            images={data.uploadedFileUrls}
            mainImageIndex={data.mainImageIndex}
            onReorder={handleImageReorder}
            onRemove={removeUploadedUrl}
            onSetMain={handleSetMainImage}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button onClick={onSave} disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "Saving..." : "Save"}
        </Button>
        <Button onClick={onCancel} variant="outline">
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
