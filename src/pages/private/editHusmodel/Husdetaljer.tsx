/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../../../components/ui/form";
import Button from "../../../components/common/button";
import Ic_upload_photo from "../../../assets/images/Ic_upload_photo.svg";
import Ic_build_housing from "../../../assets/images/Ic_build_housing.svg";
import Ic_delete_purple from "../../../assets/images/Ic_delete_purple.svg";
import Ic_garaje from "../../../assets/images/Ic_garaje.svg";
import Ic_file from "../../../assets/images/Ic_file.svg";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { TextArea } from "../../../components/ui/textarea";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db, storage } from "../../../config/firebaseConfig";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import { fetchAdminDataByEmail, fetchHusmodellData } from "../../../lib/utils";
import { Spinner } from "../../../components/Spinner";
import FileInfo from "../../../components/FileInfo";
import Modal from "../../../components/common/modal";

const formSchema = z.object({
  TypeObjekt: z.string().min(1, { message: "Velg en Type Objekt." }),
  photo: z.union([
    z
      .instanceof(File)
      .refine((file: any) => file === null || file.size <= 10 * 1024 * 1024, {
        message: "Filstørrelsen må være mindre enn 10 MB.",
      }),
    z.string(),
  ]),
  PlantegningerFasader: z
    .array(
      z.union([
        z
          .instanceof(File)
          .refine(
            (file: any) => file === null || file.size <= 10 * 1024 * 1024,
            {
              message: "Filstørrelsen må være mindre enn 10 MB.",
            }
          ),
        z.string(),
      ])
    )
    .min(1, "Minst ett bilde kreves."),
  photo3D: z
    .array(
      z.union([
        z
          .instanceof(File)
          .refine(
            (file: any) => file === null || file.size <= 10 * 1024 * 1024,
            {
              message: "Filstørrelsen må være mindre enn 10 MB.",
            }
          ),
        z.string(),
      ])
    )
    .min(1, "Minst ett bilde kreves."),
  husmodell_name: z.string().min(1, {
    message: "Navn på husmodell må bestå av minst 2 tegn.",
  }),
  link_3D_image: z
    .string()
    .min(1, {
      message: "Link til 3D bilde må bestå av minst 2 tegn.",
    })
    .optional(),
  pris: z.string().min(1, {
    message: "Pris må bestå av minst 1 tegn.",
  }),
  BRATotal: z.string().min(1, {
    message: "BRA total (bruksareal) må bestå av minst 2 tegn.",
  }),
  PRom: z.string().min(1, {
    message: "GUA (Gulvareal) må bestå av minst 2 tegn.",
  }),
  Mønehøyde: z.number().min(1, {
    message: "Mønehøyde areal må bestå av minst 2 tegn.",
  }),
  Gesimshøyde: z.number().min(1, {
    message: "Gesimshøyde areal må bestå av minst 2 tegn.",
  }),
  LB: z.string().min(1, {
    message: "LB areal må bestå av minst 2 tegn.",
  }),
  Takvinkel: z.number().min(1, {
    message: "Takvinkel areal må bestå av minst 2 tegn.",
  }),
  BebygdAreal: z.number().min(1, {
    message: "Bebygd areal (BYA) må bestå av minst 2 tegn.",
  }),
  Soverom: z.number().min(1, {
    message: "Soverom må bestå av minst 2 tegn.",
  }),
  InnvendigBod: z.number().min(1, {
    message: "InnvendigBod må bestå av minst 2 tegn.",
  }),
  Bad: z.number().min(1, {
    message: "Bad må bestå av minst 2 tegn.",
  }),
  Energimerking: z
    .string()
    .min(1, { message: "Energimerking must må spesifiseres." }),
  TilgjengeligBolig: z
    .string()
    .min(1, { message: "TilgjengeligBolig must må spesifiseres." }),
  Tomtetype: z.string().min(1, { message: "Tomtetype must må spesifiseres." }),
  Hustittel: z.string().min(1, {
    message: "Hustittel må bestå av minst 2 tegn.",
  }),
  OmHusmodellen: z.string().min(1, {
    message: "OmHusmodellen må bestå av minst 2 tegn.",
  }),
  TittelVideo: z
    .string()
    .min(1, {
      message: "Tittel på video må bestå av minst 2 tegn.",
    })
    .optional(),
  VideoLink: z
    .string()
    .refine(
      (val) =>
        val === "" ||
        /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]+$/.test(
          val
        ),
      {
        message: "Please enter a valid YouTube URL.",
      }
    ),
  signConractConstructionDrawing: z.number().min(1, {
    message:
      "Antall dager for å signere kontrakt og byggtegninger må bestå av minst 1 tegn.",
  }),
  neighborNotification: z.number().min(1, {
    message: "Antall dager for nabovarsel må bestå av minst 1 tegn.",
  }),
  appSubmitApprove: z.number().min(1, {
    message:
      "Antall dager fra søknad sendt til søknad godkjent må bestå av minst 1 tegn.",
  }),
  constuctionDayStart: z.number().min(1, {
    message:
      "Antall dager før oppstart av byggearbeider må bestå av minst 1 tegn.",
  }),
  foundationWork: z.number().min(1, {
    message: "Antall dager for grunnarbeider må bestå av minst 1 tegn.",
  }),
  concreteWork: z.number().min(1, {
    message: "Antall dager for betongarbeid må bestå av minst 1 tegn.",
  }),
  deliveryconstuctionKit: z.number().min(1, {
    message: "Antall dager for levering byggesett må bestå av minst 1 tegn.",
  }),
  denseConstuction: z.number().min(1, {
    message: "Antall dager for tett bygg må bestå av minst 1 tegn.",
  }),
  completeInside: z.number().min(1, {
    message: "Antall dager for ferdig inne må bestå av minst 1 tegn.",
  }),
  preliminaryInspection: z.number().min(1, {
    message: "Antall dager for forhåndsbefaring må bestå av minst 1 tegn.",
  }),
  takeOver: z.number().min(1, {
    message: "Antall dager for overtakelse må bestå av minst 1 tegn.",
  }),
  documents: z
    .array(
      z.union([
        z
          .instanceof(File)
          .refine(
            (file: any) => file === null || file.size <= 10 * 1024 * 1024,
            {
              message: "Filstørrelsen må være mindre enn 10 MB.",
            }
          ),
        z.string(),
      ])
    )
    .optional(),
  VelgBoligtype: z
    .string({
      required_error: "Velg en boligtype",
    })
    .min(1, "Velg en boligtype"),
  VelgEgenskaperBoligtype: z.array(z.string()).optional(),
});

export const Husdetaljer: React.FC<{
  setActiveTab: any;
}> = ({ setActiveTab }) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  const location = useLocation();
  const pathSegments = location.pathname.split("/");
  const id = pathSegments.length > 2 ? pathSegments[2] : null;
  const [loading, setLoading] = useState(true);
  const [createData, setCreateData] = useState<any>(null);

  useEffect(() => {
    const getData = async () => {
      const data = await fetchAdminDataByEmail();
      if (data) {
        setCreateData(data);
      }
    };

    getData();
  }, []);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const getData = async () => {
      const data = await fetchHusmodellData(id);
      if (data && data.Husdetaljer) {
        Object.entries(data.Husdetaljer).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            form.setValue(key as any, value);
          }
        });
      }
      setLoading(false);
    };

    getData();
  }, [form, id]);

  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const file3DInputRef = React.useRef<HTMLInputElement | null>(null);
  const fileDocumentsInputRef = React.useRef<HTMLInputElement | null>(null);
  const filePlantegningerFasaderPhotoInputRef =
    React.useRef<HTMLInputElement | null>(null);
  const uploadPhoto: any = form.watch("photo");
  const uploadPlantegningerFasaderPhoto: any = form.watch(
    "PlantegningerFasader"
  );
  const upload3DPhoto: any = form.watch("photo3D");
  const documents: any = form.watch("documents");

  const uploadFile = async (file: File, fieldName: any) => {
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB.", {
        position: "top-right",
      });
      return;
    }
    const fileType = "images";
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `${fileType}/${fileName}`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      form.setValue(fieldName, url);
      form.clearErrors(fieldName);
    } catch (error) {
      console.error(`Error uploading file for ${fieldName}:`, error);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files?.[0]) {
      await uploadFile(event.target.files[0], "photo");
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files?.[0]) {
      await uploadFile(event.dataTransfer.files[0], "photo");
    }
  };
  const handleFileUpload = async (files: FileList, fieldName: any) => {
    if (!files.length) return;

    let newImages = [
      ...(fieldName === "PlantegningerFasader"
        ? uploadPlantegningerFasaderPhoto
        : upload3DPhoto || []),
    ];

    const uploadPromises = Array.from(files).map(async (file) => {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size must be less than 2MB.", {
          position: "top-right",
        });
        return null;
      }

      const fileType = "images";
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `${fileType}/${fileName}`);

      try {
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
      } catch (error) {
        console.error("Error uploading file:", error);
        return null;
      }
    });

    const uploadedUrls = (await Promise.all(uploadPromises)).filter(
      Boolean
    ) as string[];

    if (uploadedUrls.length) {
      newImages = [...newImages, ...uploadedUrls];
      form.setValue(fieldName, newImages);
      form.clearErrors(fieldName);
    }
  };

  const handlePlantegningerFasaderFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files) {
      await handleFileUpload(event.target.files, "PlantegningerFasader");
    }
  };

  const handlePlantegningerFasaderClick = () => {
    filePlantegningerFasaderPhotoInputRef.current?.click();
  };

  const handlePlantegningerFasaderDrop = async (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    if (event.dataTransfer.files) {
      await handleFileUpload(event.dataTransfer.files, "PlantegningerFasader");
    }
  };

  const handleDocumentUpload = async (files: FileList, fieldName: any) => {
    if (!files.length) return;

    let newImages = [...(documents || [])];

    const uploadPromises = Array.from(files).map(async (file) => {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size must be less than 2MB.", {
          position: "top-right",
        });
        return null;
      }

      const fileType = "documents";
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `${fileType}/${fileName}`);

      try {
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
      } catch (error) {
        console.error("Error uploading file:", error);
        return null;
      }
    });

    const uploadedUrls = (await Promise.all(uploadPromises)).filter(
      Boolean
    ) as string[];

    if (uploadedUrls.length) {
      newImages = [...newImages, ...uploadedUrls];
      form.setValue(fieldName, newImages);
      form.clearErrors(fieldName);
    }
  };

  const handleDocumentsFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files) {
      await handleDocumentUpload(event.target.files, "documents");
    }
  };

  const handleDocumentsClick = () => {
    fileDocumentsInputRef.current?.click();
  };

  const handleDocumentsDrop = async (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    if (event.dataTransfer.files) {
      await handleDocumentUpload(event.dataTransfer.files, "documents");
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };
  const handle3DDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };
  const handlePlantegningerFasaderDragOver = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
  };

  const handle3DFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files) {
      await handleFileUpload(event.target.files, "photo3D");
    }
  };

  const handle3DClick = () => {
    file3DInputRef.current?.click();
  };

  const handle3DDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files) {
      await handleFileUpload(event.dataTransfer.files, "photo3D");
    }
  };
  const handleDocumentsDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      if (data.VideoLink && !/^https?:\/\//i.test(data.VideoLink)) {
        data.VideoLink = `https://${data.VideoLink}`;
      }

      const formatDate = (date: Date) => {
        return date
          .toLocaleString("sv-SE", { timeZone: "UTC" })
          .replace(",", "");
      };

      const uniqueId = id ? id : uuidv4();
      const husmodellDocRef = doc(db, "housemodell_configure_broker", uniqueId);

      const husdetaljerData = {
        ...data,
        link_3D_image: data.link_3D_image || null,
        id: uniqueId,
      };

      if (id) {
        await updateDoc(husmodellDocRef, {
          Husdetaljer: husdetaljerData,
          updatedAt: formatDate(new Date()),
        });
        toast.success("Updated successfully", {
          position: "top-right",
        });
      } else {
        await setDoc(husmodellDocRef, {
          Husdetaljer: husdetaljerData,
          updatedAt: formatDate(new Date()),
          createdAt: formatDate(new Date()),
          createDataBy: {
            email: createData?.email,
            photo: createData?.photo,
            name: createData?.name,
          },
        });
        toast.success("Added successfully", { position: "top-right" });
      }

      navigate(`/edit-husmodell/${uniqueId}`);
      setActiveTab(1);
    } catch (error) {
      console.error("Firestore operation failed:", error);
      toast.error("Something went wrong. Please try again.", {
        position: "top-right",
      });
    }
  };
  const selectedHouseType = form.watch("TypeObjekt");
  const totalDays = [
    form.watch("signConractConstructionDrawing"),
    form.watch("neighborNotification"),
    form.watch("appSubmitApprove"),
    form.watch("constuctionDayStart"),
    form.watch("foundationWork"),
    form.watch("concreteWork"),
    form.watch("deliveryconstuctionKit"),
    form.watch("denseConstuction"),
    form.watch("completeInside"),
    form.watch("preliminaryInspection"),
    form.watch("takeOver"),
  ].reduce((acc, curr) => acc + (curr || 0), 0);

  const VelgboligType = [
    "Funkis",
    "Moderne",
    "Herskapelig",
    "Tradisjonelt",
    "Tomannsbolig",
  ];

  const boligOptions = [
    "Tomannsbolig",
    "Med utleiedal",
    "Ett plan",
    "Med garasje",
  ];

  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const handleDeleteClick = (index: number) => {
    setDeleteIndex(index);
    setShowConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (deleteIndex !== null) {
      const updatedFiles = documents.filter(
        (_: any, i: number) => i !== deleteIndex
      );
      form.setValue("documents", updatedFiles);
    }
    setShowConfirm(false);
    setDeleteIndex(null);
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
    setDeleteIndex(null);
  };

  const handleConfirmPopup = () => {
    if (showConfirm) {
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="relative">
          <div className="p-6 mb-[100px]">
            <div className="flex flex-col gap-8">
              <div className="flex gap-8">
                <div className="w-[20%]">
                  <h5 className="text-black text-sm font-medium">
                    Grunninformasjon
                  </h5>
                  <p className="text-gray text-sm whitespace-nowrap">
                    Legg til bilder og husdetaljer
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-6 w-[80%] shadow-shadow2 px-6 py-5 rounded-lg">
                  <div className="col-span-2">
                    <p
                      className={`${
                        form.formState.errors.TypeObjekt
                          ? "text-red"
                          : "text-black"
                      } mb-[6px] text-sm font-medium`}
                    >
                      Type objekt
                    </p>
                    <div className="flex gap-4 items-center">
                      {[
                        {
                          label: "Bolig",
                          icon: Ic_build_housing,
                          value: "bolig",
                        },
                        {
                          label: "Hytte",
                          icon: Ic_build_housing,
                          value: "hytte",
                        },
                        { label: "Garasje", icon: Ic_garaje, value: "garasje" },
                      ].map((item: any, index: number) => (
                        <div
                          key={index}
                          onClick={() => {
                            form.setValue("TypeObjekt", item.value);
                            form.clearErrors("TypeObjekt");
                          }}
                          className={`border-2 rounded-lg p-2 cursor-pointer ${
                            selectedHouseType === item.value
                              ? "border-purple"
                              : "border-gray1"
                          }`}
                        >
                          <div className="bg-[#F9FAFB] rounded-[8px] h-[125px] w-[198px] flex items-center justify-center mb-2">
                            <img src={item.icon} alt={item.label} />
                          </div>
                          <div className="text-darkBlack text-sm text-center font-medium">
                            {item.label}
                          </div>
                        </div>
                      ))}
                    </div>
                    {form.formState.errors.TypeObjekt && (
                      <p className="text-red text-sm mt-1">
                        {form.formState.errors.TypeObjekt.message}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name={`VelgBoligtype`}
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p className="text-black mb-3 text-base font-semibold">
                            Velg boligtype
                          </p>
                          <FormControl>
                            <div className="flex items-center gap-5">
                              {VelgboligType.map((option) => (
                                <div
                                  key={option}
                                  className="relative flex items-center gap-2"
                                >
                                  <input
                                    className={`bg-white rounded-[8px] border text-black
        ${
          fieldState?.error ? "border-red" : "border-gray1"
        } h-4 w-4 accent-primary`}
                                    type="radio"
                                    value={option}
                                    onChange={(e) => {
                                      form.setValue(
                                        "VelgBoligtype",
                                        e.target.value
                                      );
                                    }}
                                    checked={field.value === option}
                                  />
                                  <p
                                    className={`text-gray text-sm font-medium`}
                                  >
                                    {option}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name={`VelgEgenskaperBoligtype`}
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p className="text-black mb-3 text-base font-semibold">
                            Velg egenskaper til boligtype
                          </p>
                          <FormControl>
                            <div className="flex items-center gap-5">
                              {boligOptions.map((option) => (
                                <div
                                  key={option}
                                  className="relative flex items-center gap-2"
                                >
                                  <input
                                    className={`bg-white rounded-[8px] border text-black
        ${
          fieldState?.error ? "border-red" : "border-gray1"
        } h-4 w-4 accent-primary`}
                                    type="checkbox"
                                    value={option}
                                    checked={field.value?.includes(option)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      const currentValues = field.value || [];

                                      if (checked) {
                                        form.setValue(
                                          "VelgEgenskaperBoligtype",
                                          [...currentValues, option]
                                        );
                                      } else {
                                        form.setValue(
                                          "VelgEgenskaperBoligtype",
                                          currentValues.filter(
                                            (val) => val !== option
                                          )
                                        );
                                      }
                                    }}
                                  />
                                  <p
                                    className={`text-gray text-sm font-medium`}
                                  >
                                    {option}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="husmodell_name"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Navn på husmodell
                          </p>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Skriv inn Navn på husmodell"
                                {...field}
                                className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                type="text"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="pris"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Pris fra
                          </p>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Skriv inn Pris fra"
                                {...field}
                                className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                inputMode="numeric"
                                type="text"
                                onChange={({ target: { value } }: any) =>
                                  field.onChange({
                                    target: {
                                      name: "pris",
                                      value: value.replace(/\D/g, "")
                                        ? new Intl.NumberFormat("no-NO").format(
                                            Number(value.replace(/\D/g, ""))
                                          )
                                        : "",
                                    },
                                  })
                                }
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-2 flex gap-6 items-center">
                    <FormField
                      control={form.control}
                      name="photo"
                      render={({ fieldState }) => (
                        <FormItem className="w-full">
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Hovedbilde
                          </p>
                          <FormControl>
                            <div className="flex items-center gap-5 w-full">
                              {uploadPhoto && (
                                <img
                                  src={uploadPhoto}
                                  alt="logo"
                                  height="140px"
                                  width="140px"
                                />
                              )}
                              <div className="relative w-full">
                                <div
                                  className="border border-gray2 rounded-[8px] px-3 laptop:px-6 py-4 flex justify-center items-center flex-col gap-3 cursor-pointer w-full"
                                  onDragOver={handleDragOver}
                                  onClick={handleClick}
                                  onDrop={handleDrop}
                                >
                                  <img src={Ic_upload_photo} alt="upload" />
                                  <p className="text-gray text-sm text-center truncate w-full">
                                    <span className="text-primary font-medium truncate">
                                      Klikk for opplasting
                                    </span>{" "}
                                    eller dra-og-slipp
                                  </p>
                                  <p className="text-gray text-sm text-center truncate w-full">
                                    SVG, PNG, JPG or GIF (maks. 800x400px)
                                  </p>
                                  <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".svg, .png, .jpg, .jpeg, .gif"
                                    onChange={handleFileChange}
                                    name="photo"
                                  />
                                </div>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-2">
                    <p className={`text-black mb-[6px] text-sm font-medium`}>
                      Illustrasjoner
                    </p>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <FormField
                          control={form.control}
                          name="link_3D_image"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <p
                                className={`${
                                  fieldState.error ? "text-red" : "text-black"
                                } mb-[6px] text-sm font-medium`}
                              >
                                Link til 3D bilde
                              </p>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Legg til 3D link fra Norkart"
                                    {...field}
                                    className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                    type="text"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="photo"
                        render={() => (
                          <FormItem className="w-full">
                            <FormControl>
                              <div className="flex items-center gap-5 w-full">
                                <div className="relative w-full">
                                  <div
                                    className="border border-gray2 rounded-[8px] px-3 laptop:px-6 py-4 flex justify-center items-center flex-col gap-3 cursor-pointer w-full"
                                    onDragOver={handle3DDragOver}
                                    onClick={handle3DClick}
                                    onDrop={handle3DDrop}
                                  >
                                    <img src={Ic_upload_photo} alt="upload" />
                                    <p className="text-gray text-sm text-center truncate w-full">
                                      <span className="text-primary font-medium truncate">
                                        Klikk for opplasting
                                      </span>{" "}
                                      eller dra-og-slipp
                                    </p>
                                    <p className="text-gray text-sm text-center truncate w-full">
                                      SVG, PNG, JPG or GIF (maks. 800x400px)
                                    </p>
                                    <input
                                      type="file"
                                      ref={file3DInputRef}
                                      className="hidden"
                                      accept=".svg, .png, .jpg, .jpeg, .gif"
                                      onChange={handle3DFileChange}
                                      name="photo3D"
                                      multiple
                                    />
                                  </div>
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {upload3DPhoto && (
                      <div className="mt-5 flex items-center gap-5 flex-wrap">
                        {upload3DPhoto?.map((file: any, index: number) => (
                          <div
                            className="relative h-[140px] w-[140px]"
                            key={index}
                          >
                            <img
                              src={file}
                              alt="logo"
                              className="object-cover w-full h-full rounded-lg"
                            />
                            <div
                              className="absolute top-2 right-2 bg-[#FFFFFFCC] rounded-[12px] p-[6px] cursor-pointer"
                              onClick={() => {
                                const updatedFiles = upload3DPhoto.filter(
                                  (_: any, i: number) => i !== index
                                );
                                form.setValue("photo3D", updatedFiles);
                              }}
                            >
                              <img src={Ic_delete_purple} alt="delete" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="BRATotal"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            BRA total (bruksareal)
                          </p>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Skriv inn BRA total (bruksareal)"
                                {...field}
                                className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                type="text"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="PRom"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            GUA (Gulvareal)
                          </p>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Skriv inn GUA (Gulvareal)"
                                {...field}
                                className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                type="text"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="Mønehøyde"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Mønehøyde
                          </p>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Skriv inn Mønehøyde"
                                {...field}
                                className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                type="number"
                                onChange={(e: any) =>
                                  field.onChange(Number(e.target.value) || "")
                                }
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="Gesimshøyde"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Gesimshøyde
                          </p>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Skriv inn Gesimshøyde"
                                {...field}
                                className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                type="number"
                                onChange={(e: any) =>
                                  field.onChange(Number(e.target.value) || "")
                                }
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="Takvinkel"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Takvinkel
                          </p>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Skriv inn Takvinkel"
                                {...field}
                                className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                type="number"
                                onChange={(e: any) =>
                                  field.onChange(Number(e.target.value) || "")
                                }
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="BebygdAreal"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Bebygd areal (BYA)
                          </p>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Skriv inn Bebygd areal (BYA)"
                                {...field}
                                className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                type="number"
                                onChange={(e: any) =>
                                  field.onChange(Number(e.target.value) || "")
                                }
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="LB"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            L x B
                          </p>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Skriv inn L x B"
                                {...field}
                                className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                type="text"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="Soverom"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Soverom
                          </p>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Skriv inn Soverom"
                                {...field}
                                className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                type="number"
                                onChange={(e: any) =>
                                  field.onChange(Number(e.target.value) || "")
                                }
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="Bad"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Bad
                          </p>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Skriv inn Bad"
                                {...field}
                                className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                type="number"
                                onChange={(e: any) =>
                                  field.onChange(Number(e.target.value) || "")
                                }
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="InnvendigBod"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Innvendig bod
                          </p>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Skriv inn Innvendig bod"
                                {...field}
                                className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                type="number"
                                onChange={(e: any) =>
                                  field.onChange(Number(e.target.value) || "")
                                }
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="Energimerking"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Energimerking
                          </p>
                          <FormControl>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                              }}
                              value={field.value}
                            >
                              <SelectTrigger
                                className={`bg-white rounded-[8px] border text-black
                              ${
                                fieldState?.error
                                  ? "border-red"
                                  : "border-gray1"
                              } `}
                              >
                                <SelectValue placeholder="Enter Energimerking" />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                <SelectGroup>
                                  <SelectItem value="A">A</SelectItem>
                                  <SelectItem value="B">B</SelectItem>
                                  <SelectItem value="C">C</SelectItem>
                                  <SelectItem value="D">D</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="TilgjengeligBolig"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Tilgjengelig bolig
                          </p>
                          <FormControl>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                              }}
                              value={field.value}
                            >
                              <SelectTrigger
                                className={`bg-white rounded-[8px] border text-black
                              ${
                                fieldState?.error
                                  ? "border-red"
                                  : "border-gray1"
                              } `}
                              >
                                <SelectValue placeholder="Enter Tilgjengelig bolig" />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                <SelectGroup>
                                  <SelectItem value="Ja">Ja</SelectItem>
                                  <SelectItem value="Nei">Nei</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="Tomtetype"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Tomtetype
                          </p>
                          <FormControl>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                              }}
                              value={field.value}
                            >
                              <SelectTrigger
                                className={`bg-white rounded-[8px] border text-black
                              ${
                                fieldState?.error
                                  ? "border-red"
                                  : "border-gray1"
                              } `}
                              >
                                <SelectValue placeholder="Enter Tomtetype" />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                <SelectGroup>
                                  <SelectItem value="Flat">Flat</SelectItem>
                                  <SelectItem value="Skrånet">
                                    Skrånet
                                  </SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="w-[20%]">
                  <h5 className="text-black text-sm font-medium">Dokumenter</h5>
                  <p className="text-gray text-sm whitespace-nowrap">
                    Legg til dokument for huset
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-6 w-[80%] shadow-shadow2 px-6 py-5 rounded-lg">
                  <div className="col-span-2">
                    <p className={`text-black mb-[6px] text-sm font-medium`}>
                      Dokumenter
                    </p>
                    <div className="grid grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="documents"
                        render={() => (
                          <FormItem className="w-full">
                            <FormControl>
                              <div className="flex items-center gap-5 w-full">
                                <div className="relative w-full">
                                  <div
                                    className="border border-gray2 rounded-[8px] px-3 laptop:px-6 py-4 flex justify-center items-center flex-col gap-3 cursor-pointer w-full"
                                    onDragOver={handleDocumentsDragOver}
                                    onClick={handleDocumentsClick}
                                    onDrop={handleDocumentsDrop}
                                  >
                                    <img src={Ic_upload_photo} alt="upload" />
                                    <p className="text-gray text-sm text-center truncate w-full">
                                      <span className="text-primary font-medium truncate">
                                        Klikk for opplasting
                                      </span>{" "}
                                      eller dra-og-slipp
                                    </p>
                                    <p className="text-gray text-sm text-center truncate w-full">
                                      PDF (maks. 800x400px)
                                    </p>
                                    <input
                                      type="file"
                                      ref={fileDocumentsInputRef}
                                      className="hidden"
                                      accept=".pdf"
                                      onChange={handleDocumentsFileChange}
                                      name="documents"
                                      multiple
                                    />
                                  </div>
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div>
                        {documents && (
                          <div className="flex flex-col items-center gap-3">
                            {documents?.map((file: any, index: number) => (
                              <div
                                className="border border-gray2 rounded-lg p-3 bg-[#F9FAFB] flex items-center justify-between relative w-full"
                                key={index}
                              >
                                <div className="flex items-start gap-4 truncate">
                                  <div className="border-[4px] border-lightPurple rounded-full flex items-center justify-center">
                                    <div className="bg-darkPurple w-7 h-7 rounded-full flex justify-center items-center">
                                      <img src={Ic_file} alt="file" />
                                    </div>
                                  </div>
                                  <FileInfo file={file} />
                                </div>
                                <div>
                                  <div
                                    className="bg-[#FFFFFFCC] rounded-[12px] p-[6px] cursor-pointer w-8 h-8"
                                    onClick={() => handleDeleteClick(index)}
                                  >
                                    <img src={Ic_delete_purple} alt="delete" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="w-[20%]">
                  <h5 className="text-black text-sm font-medium">
                    Tidskalkulering
                  </h5>
                  <p className="text-gray text-sm whitespace-nowrap">
                    Legg til forventet søknad og byggerperiode.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-6 w-[80%] shadow-shadow2 px-6 py-5 rounded-lg">
                  <div>
                    <h4 className="text-[#111322] font-semibold text-lg mb-4">
                      Antall dager fra lead til byggestart
                    </h4>
                    <div className="flex flex-col gap-6">
                      <div>
                        <FormField
                          control={form.control}
                          name="signConractConstructionDrawing"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <p
                                className={`${
                                  fieldState.error ? "text-red" : "text-black"
                                } mb-[6px] text-sm font-medium`}
                              >
                                Antall dager for å{" "}
                                <span className="font-bold">
                                  signere kontrakt og byggtegninger
                                </span>
                              </p>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Angi verdi i dager"
                                    {...field}
                                    className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                    type="number"
                                    onChange={(e: any) =>
                                      field.onChange(
                                        Number(e.target.value) || ""
                                      )
                                    }
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div>
                        <FormField
                          control={form.control}
                          name="neighborNotification"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <p
                                className={`${
                                  fieldState.error ? "text-red" : "text-black"
                                } mb-[6px] text-sm font-medium`}
                              >
                                Antall dager for{" "}
                                <span className="font-bold">nabovarsel</span>
                              </p>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Angi verdi i dager"
                                    {...field}
                                    className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                    type="number"
                                    onChange={(e: any) =>
                                      field.onChange(
                                        Number(e.target.value) || ""
                                      )
                                    }
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div>
                        <FormField
                          control={form.control}
                          name="appSubmitApprove"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <p
                                className={`${
                                  fieldState.error ? "text-red" : "text-black"
                                } mb-[6px] text-sm font-medium`}
                              >
                                Antall dager fra{" "}
                                <span className="font-bold">
                                  søknad sendt til søknad godkjent
                                </span>
                              </p>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Angi verdi i dager"
                                    {...field}
                                    className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                    type="number"
                                    onChange={(e: any) =>
                                      field.onChange(
                                        Number(e.target.value) || ""
                                      )
                                    }
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div>
                        <FormField
                          control={form.control}
                          name="constuctionDayStart"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <p
                                className={`${
                                  fieldState.error ? "text-red" : "text-black"
                                } mb-[6px] text-sm font-medium`}
                              >
                                Antall dager før{" "}
                                <span className="font-bold">
                                  oppstart av byggearbeider
                                </span>
                              </p>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Angi verdi i dager"
                                    {...field}
                                    className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                    type="number"
                                    onChange={(e: any) =>
                                      field.onChange(
                                        Number(e.target.value) || ""
                                      )
                                    }
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[#111322] font-semibold text-lg mb-4">
                      Antall dager fra byggestart til overtakelse
                    </h4>
                    <div className="flex flex-col gap-6">
                      <div>
                        <FormField
                          control={form.control}
                          name="foundationWork"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <p
                                className={`${
                                  fieldState.error ? "text-red" : "text-black"
                                } mb-[6px] text-sm font-medium`}
                              >
                                Antall dager for{" "}
                                <span className="font-bold">grunnarbeider</span>
                              </p>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Angi verdi i dager"
                                    {...field}
                                    className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                    type="number"
                                    onChange={(e: any) =>
                                      field.onChange(
                                        Number(e.target.value) || ""
                                      )
                                    }
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div>
                        <FormField
                          control={form.control}
                          name="concreteWork"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <p
                                className={`${
                                  fieldState.error ? "text-red" : "text-black"
                                } mb-[6px] text-sm font-medium`}
                              >
                                Antall dager for
                                <span className="font-bold">betongarbeid</span>
                              </p>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Angi verdi i dager"
                                    {...field}
                                    className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                    type="number"
                                    onChange={(e: any) =>
                                      field.onChange(
                                        Number(e.target.value) || ""
                                      )
                                    }
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div>
                        <FormField
                          control={form.control}
                          name="deliveryconstuctionKit"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <p
                                className={`${
                                  fieldState.error ? "text-red" : "text-black"
                                } mb-[6px] text-sm font-medium`}
                              >
                                Antall dager for{" "}
                                <span className="font-bold">
                                  levering byggesett
                                </span>
                              </p>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Angi verdi i dager"
                                    {...field}
                                    className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                    type="number"
                                    onChange={(e: any) =>
                                      field.onChange(
                                        Number(e.target.value) || ""
                                      )
                                    }
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div>
                        <FormField
                          control={form.control}
                          name="denseConstuction"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <p
                                className={`${
                                  fieldState.error ? "text-red" : "text-black"
                                } mb-[6px] text-sm font-medium`}
                              >
                                Antall dager for{" "}
                                <span className="font-bold">tett bygg</span>
                              </p>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Angi verdi i dager"
                                    {...field}
                                    className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                    type="number"
                                    onChange={(e: any) =>
                                      field.onChange(
                                        Number(e.target.value) || ""
                                      )
                                    }
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div>
                        <FormField
                          control={form.control}
                          name="completeInside"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <p
                                className={`${
                                  fieldState.error ? "text-red" : "text-black"
                                } mb-[6px] text-sm font-medium`}
                              >
                                Antall dager for{" "}
                                <span className="font-bold">ferdig inne</span>
                              </p>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Angi verdi i dager"
                                    {...field}
                                    className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                    type="number"
                                    onChange={(e: any) =>
                                      field.onChange(
                                        Number(e.target.value) || ""
                                      )
                                    }
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div>
                        <FormField
                          control={form.control}
                          name="preliminaryInspection"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <p
                                className={`${
                                  fieldState.error ? "text-red" : "text-black"
                                } mb-[6px] text-sm font-medium`}
                              >
                                Antall dager for{" "}
                                <span className="font-bold">
                                  forhåndsbefaring
                                </span>
                              </p>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Angi verdi i dager"
                                    {...field}
                                    className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                    type="number"
                                    onChange={(e: any) =>
                                      field.onChange(
                                        Number(e.target.value) || ""
                                      )
                                    }
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div>
                        <FormField
                          control={form.control}
                          name="takeOver"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <p
                                className={`${
                                  fieldState.error ? "text-red" : "text-black"
                                } mb-[6px] text-sm font-medium`}
                              >
                                Antall dager for{" "}
                                <span className="font-bold">overtakelse</span>
                              </p>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Angi verdi i dager"
                                    {...field}
                                    className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                    type="number"
                                    onChange={(e: any) =>
                                      field.onChange(
                                        Number(e.target.value) || ""
                                      )
                                    }
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 flex flex-col gap-6 items-center justify-center">
                    <h3 className="text-black text-sm">
                      TOTALT ANTALL DAGER{" "}
                      <span className="font-bold">
                        FRA LEAD TIL OVERTAKELSE
                      </span>
                    </h3>
                    <p className="text-2xl font-semibold text-black">
                      {totalDays}{" "}
                      <span className="text-[#34405499]">dager</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="w-[20%]">
                  <h5 className="text-black text-sm font-medium">
                    Husbeskrivelse og plantegninger
                  </h5>
                  <p className="text-gray text-sm whitespace-nowrap">
                    Legg til bilder og husbeskrivelse
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-6 w-[80%] shadow-shadow2 px-6 py-5 rounded-lg">
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="Hustittel"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Hustittel
                          </p>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Skriv inn Hustittel"
                                {...field}
                                className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                type="text"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="OmHusmodellen"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Om husmodellen
                          </p>
                          <FormControl>
                            <div className="relative">
                              <TextArea
                                placeholder="Skriv inn Om husmodellen"
                                {...field}
                                className={`h-[300px] bg-white rounded-[8px] border text-black
                                  ${
                                    fieldState?.error
                                      ? "border-red"
                                      : "border-gray1"
                                  } `}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="">
                    <FormField
                      control={form.control}
                      name="PlantegningerFasader"
                      render={({ fieldState }) => (
                        <FormItem className="w-full">
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Plantegninger og fasader
                          </p>
                          <FormControl>
                            <div className="flex items-center gap-5 w-full">
                              <div className="relative w-full">
                                <div
                                  className="border border-gray2 rounded-[8px] px-3 laptop:px-6 py-4 flex justify-center items-center flex-col gap-3 cursor-pointer w-full"
                                  onDragOver={
                                    handlePlantegningerFasaderDragOver
                                  }
                                  onClick={handlePlantegningerFasaderClick}
                                  onDrop={handlePlantegningerFasaderDrop}
                                >
                                  <img src={Ic_upload_photo} alt="upload" />
                                  <p className="text-gray text-sm text-center truncate w-full">
                                    <span className="text-primary font-medium truncate">
                                      Klikk for opplasting
                                    </span>{" "}
                                    eller dra-og-slipp
                                  </p>
                                  <p className="text-gray text-sm text-center truncate w-full">
                                    SVG, PNG, JPG or GIF (maks. 800x400px)
                                  </p>
                                  <input
                                    type="file"
                                    ref={filePlantegningerFasaderPhotoInputRef}
                                    className="hidden"
                                    accept=".svg, .png, .jpg, .jpeg, .gif"
                                    onChange={
                                      handlePlantegningerFasaderFileChange
                                    }
                                    name="PlantegningerFasader"
                                    multiple
                                  />
                                </div>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    {uploadPlantegningerFasaderPhoto && (
                      <div className="mt-5 flex items-center gap-5 flex-wrap">
                        {uploadPlantegningerFasaderPhoto?.map(
                          (file: any, index: number) => (
                            <div
                              className="relative h-[140px] w-[140px]"
                              key={index}
                            >
                              <img
                                src={file}
                                alt="logo"
                                className="object-cover w-full h-full rounded-lg"
                              />
                              <div
                                className="absolute top-2 right-2 bg-[#FFFFFFCC] rounded-[12px] p-[6px] cursor-pointer"
                                onClick={() => {
                                  const updatedFiles =
                                    uploadPlantegningerFasaderPhoto.filter(
                                      (_: any, i: number) => i !== index
                                    );
                                  form.setValue(
                                    "PlantegningerFasader",
                                    updatedFiles
                                  );
                                }}
                              >
                                <img src={Ic_delete_purple} alt="delete" />
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="TittelVideo"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Tittel på video
                          </p>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Skriv inn Tittel på video"
                                {...field}
                                className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                type="text"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="VideoLink"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <p
                            className={`${
                              fieldState.error ? "text-red" : "text-black"
                            } mb-[6px] text-sm font-medium`}
                          >
                            Video link
                          </p>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Skriv inn Video link"
                                {...field}
                                className={`bg-white rounded-[8px] border text-black
                                          ${
                                            fieldState?.error
                                              ? "border-red"
                                              : "border-gray1"
                                          } `}
                                type="text"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end w-full gap-5 items-center sticky bottom-0 bg-white z-50 border-t border-gray2 p-4 left-0">
            <Link to={"/Husmodell"} className="w-1/2 sm:w-auto">
              <Button
                text="Avbryt"
                className="border border-gray2 text-black text-sm rounded-[8px] h-[40px] font-medium relative px-4 py-[10px] flex items-center gap-2"
              />
            </Link>
            <Button
              text="Lagre"
              className="border border-purple bg-purple text-white text-sm rounded-[8px] h-[40px] font-medium relative px-4 py-[10px] flex items-center gap-2"
              type="submit"
            />
          </div>
          {loading && <Spinner />}
        </form>
      </Form>

      {showConfirm && (
        <Modal onClose={handleConfirmPopup} isOpen={true}>
          <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
            <div className="bg-white p-6 rounded-lg">
              <p className="mb-4">Er du sikker på at du vil slette?</p>
              <div className="flex justify-center gap-4">
                <div onClick={handleCancelDelete} className="w-1/2 sm:w-auto">
                  <Button
                    text="Avbryt"
                    className="border border-gray2 text-black text-sm rounded-[8px] h-[40px] font-medium relative px-4 py-[10px] flex items-center gap-2"
                  />
                </div>
                <Button
                  text="Bekrefte"
                  className="border border-purple bg-purple text-white text-sm rounded-[8px] h-[40px] font-medium relative px-4 py-[10px] flex items-center gap-2"
                  onClick={handleConfirmDelete}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
