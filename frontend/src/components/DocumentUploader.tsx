import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DocumentUploaderProps {
  chatId: string;
}

export default function DocumentUploader({ chatId }: DocumentUploaderProps) {
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const queryClient = useQueryClient();

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axios.post(`/api/chats/${chatId}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // Invalidate queries to refresh the chat data
    queryClient.invalidateQueries(["chat", chatId]);

    return { name: file.name, data: response.data };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFileName(file.name);
      setUploadStatus("idle");

      toast.promise(uploadFile(file), {
        loading: `Uploading ${file.name}...`,
        success: (data) => {
          setUploadStatus("success");
          return `${data.name} uploaded successfully!`;
        },
        error: (err) => {
          setUploadStatus("error");
          return "Failed to upload document. Please try again.";
        },
      });

      e.target.value = "";
    }
  };

  const getStatusIcon = () => {
    if (uploadStatus === "idle" && uploadedFileName)
      return <Loader2 className="w-4 h-4 animate-spin" />;
    return <Upload className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (uploadStatus === "idle" && uploadedFileName) return "Uploading...";
    return "Upload PDF Document";
  };

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        asChild
        disabled={uploadStatus === "idle" && uploadedFileName !== ""}
        className="w-full sm:w-auto"
      >
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleChange}
            className="sr-only"
            disabled={uploadStatus === "idle" && uploadedFileName !== ""}
          />
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </label>
      </Button>
    </div>
  );
}
