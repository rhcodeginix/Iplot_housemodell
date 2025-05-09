import React, { useEffect, useState } from "react";
import Ic_upload_blue_img from "../../../assets/images/Ic_upload_blue_img.svg";
import { useLocation, useNavigate } from "react-router-dom";
import { Spinner } from "../../../components/Spinner";
import { fetchHusmodellData } from "../../../lib/utils";
import Button from "../../../components/common/button";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import { toast } from "react-hot-toast";
import * as pdfjsLib from "pdfjs-dist";
import { Pencil, Trash2 } from "lucide-react";
import Modal from "../../../components/common/modal";

export const Huskonfigurator: React.FC<{ setActiveTab: any }> = ({
  setActiveTab,
}) => {
  const location = useLocation();
  const pathSegments = location.pathname.split("/");
  const id = pathSegments.length > 2 ? pathSegments[2] : null;
  const [loading, setLoading] = useState(true);
  const [roomsData, setRoomsData] = useState<any>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const getData = async () => {
      const data = await fetchHusmodellData(id);

      if (data && data?.Plantegninger) {
        setRoomsData(data?.Plantegninger);
      }
      setLoading(false);
    };

    getData();
  }, [id]);
  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }, []);

  const file3DInputRef = React.useRef<HTMLInputElement | null>(null);
  const convertPdfToImage = async (pdfData: string) => {
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: atob(pdfData.split(",")[1]),
      });
      const pdfDocument = await loadingTask.promise;

      const page = await pdfDocument.getPage(1);

      const canvas = document.createElement("canvas");
      if (!canvas) return;

      const context = canvas.getContext("2d");
      if (!context) return;

      const viewport = page.getViewport({ scale: 1.0 });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      const imgDataUrl = canvas.toDataURL("image/png");
      return imgDataUrl;
    } catch (err) {
      console.error("Error loading PDF document:", err);
    }
  };
  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    const formData = new FormData();
    formData.append("file", files[0]);
    setLoading(true);
    try {
      const response = await fetch(
        "https://iplotnor-hf-floor-plan-api.hf.space/upload",
        {
          method: "POST",
          headers: {
            accept: "application/json",
          },
          body: formData,
          mode: "cors",
        }
      );

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const data = await response.json();
      if (data && data?.pdf_id) {
        const PDFresponse = await fetch(
          `https://iplotnor-hf-floor-plan-api.hf.space/analyze/${data?.pdf_id}`,
          {
            method: "POST",
            headers: {
              accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              description: "string",
            }),
            mode: "cors",
          }
        );

        if (!PDFresponse.ok) {
          throw new Error(`HTTP error! status: ${PDFresponse.status}`);
        }

        const PDFdata = await PDFresponse.json();
        if (PDFdata) {
          let base64PDF: string | undefined;

          const reader = new FileReader();
          reader.onloadend = async () => {
            base64PDF = reader.result as string;

            if (base64PDF) {
              const imageBase64 = await convertPdfToImage(base64PDF);

              if (imageBase64) {
                const husmodellDocRef = doc(
                  db,
                  "housemodell_configure_broker",
                  String(id)
                );

                const docSnap = await getDoc(husmodellDocRef);
                const existingData = docSnap.exists()
                  ? docSnap.data().Plantegninger || []
                  : [];
                const newIndex = existingData.length + 1;
                const updatedPdfData = {
                  ...PDFdata,
                  image: imageBase64,
                  title: `floor ${newIndex}`,
                };
                setRoomsData((prev: any) => [...prev, updatedPdfData]);

                const finalData = [];
                finalData.push(updatedPdfData);

                const updatedPlantegninger = [...existingData, ...finalData];
                const formatDate = (date: Date) => {
                  return date
                    .toLocaleString("sv-SE", { timeZone: "UTC" })
                    .replace(",", "");
                };
                await updateDoc(husmodellDocRef, {
                  Plantegninger: updatedPlantegninger,
                  id: id,
                  updatedAt: formatDate(new Date()),
                });
                toast.success(PDFdata.message, {
                  position: "top-right",
                });
                setLoading(false);
              }
            }
          };
          reader.readAsDataURL(files[0]);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      setLoading(false);
      toast.error("File upload error!", {
        position: "top-right",
      });
    }
  };

  const handle3DDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };
  const handle3DFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files) {
      await handleFileUpload(event.target.files);
    }
  };

  const handle3DClick = async () => {
    file3DInputRef.current?.click();
  };

  const handle3DDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files) {
      await handleFileUpload(event.dataTransfer.files);
    }
  };

  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editedFloorName, setEditedFloorName] = useState<string>("");
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(
    null
  );
  const handleDeleteFloor = async (indexToDelete: number) => {
    const husmodellDocRef = doc(db, "housemodell_configure_broker", String(id));

    try {
      const docSnap = await getDoc(husmodellDocRef);
      const existingData = docSnap.exists()
        ? docSnap.data().Plantegninger || []
        : [];

      const updatedData = existingData.filter(
        (_: any, i: any) => i !== indexToDelete
      );

      await updateDoc(husmodellDocRef, {
        Plantegninger: updatedData,
        updatedAt: new Date().toISOString(),
      });

      setRoomsData(updatedData);
      setConfirmDeleteIndex(null);

      toast.success("Floor deleted successfully!", { position: "top-right" });
    } catch (error) {
      console.error("Error deleting floor:", error);
      toast.error("Failed to delete floor", { position: "top-right" });
    }
  };
  const handleConfirmPopup = () => {
    if (confirmDeleteIndex) {
      setConfirmDeleteIndex(null);
    } else {
      setConfirmDeleteIndex(confirmDeleteIndex);
    }
  };

  return (
    <>
      <div className="px-8 py-6">
        <h3 className="text-darkBlack text-2xl font-semibold mb-2">
          Last opp plantegningen din
        </h3>
        <p className="text-secondary text-lg">
          Our AI will auto detect your floor plan and how you customisation
          options
        </p>
      </div>
      <div className="px-8 pb-[156px]">
        <div
          className="relative p-2 rounded-lg w-max"
          style={{
            boxShadow: "0px 2px 4px -2px #1018280F, 0px 4px 8px -2px #1018281A",
          }}
        >
          <div
            className="border border-gray2 border-dashed rounded-lg px-3 flex-col items-center justify-center laptop:px-[42px] py-4 flex gap-6 cursor-pointer w-full"
            onClick={handle3DClick}
            onDrop={handle3DDrop}
            onDrag={handle3DDragOver}
          >
            <img src={Ic_upload_blue_img} alt="upload" />
            <div className="flex items-center justify-center flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-primary font-medium whitespace-nowrap flex items-center justify-center border-2 border-purple rounded-[40px] h-[36px] py-2 px-4">
                  Bla gjennom
                </span>
                <p className="text-gray text-sm text-center truncate w-full">
                  Slipp filen her for å laste den opp
                </p>
              </div>
              <p className="text-gray text-sm truncate w-full text-center">
                Filformater: Kun PDF, maks 2 MB
              </p>
            </div>
            <input
              type="file"
              ref={file3DInputRef}
              className="hidden"
              accept=".pdf"
              onChange={handle3DFileChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 w-full mt-8">
          {roomsData && roomsData.length > 0
            ? roomsData.map((item: any, index: number) => {
                const isEditing = editIndex === index;

                return (
                  <div
                    key={index}
                    className="relative shadow-shadow2 cursor-pointer p-4 rounded-lg flex flex-col gap-4"
                    onClick={() => {
                      setActiveTab(2);
                      navigate(`?pdf_id=${item?.pdf_id}`);
                    }}
                  >
                    <div className="flex gap-2 items-center justify-between mb-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedFloorName}
                          onChange={(e) => setEditedFloorName(e.target.value)}
                          className="border border-gray1 rounded px-2 py-1 w-full"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-darkBlack font-medium">
                          {item?.title || `Floor ${index + 1}`}
                        </span>
                      )}
                      <div className="flex items-center gap-3">
                        {isEditing ? (
                          <button
                            className="bg-purple text-white px-4 py-2 rounded text-sm self-end"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const updatedRooms = [...roomsData];
                              updatedRooms[index] = {
                                ...updatedRooms[index],
                                title: editedFloorName,
                              };

                              setRoomsData(updatedRooms);
                              setEditIndex(null);

                              const husmodellDocRef = doc(
                                db,
                                "housemodell_configure_broker",
                                String(id)
                              );

                              await updateDoc(husmodellDocRef, {
                                Plantegninger: updatedRooms,
                                updatedAt: new Date().toISOString(),
                              });

                              toast.success("Name updated!", {
                                position: "top-right",
                              });
                            }}
                          >
                            Oppdater
                          </button>
                        ) : (
                          <Pencil
                            className="w-6 h-6 text-purple cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditIndex(index);
                              setEditedFloorName(
                                item?.title || `Floor ${index + 1}`
                              );
                            }}
                          />
                        )}

                        <Trash2
                          className="w-6 h-6 text-red cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setConfirmDeleteIndex(index);
                          }}
                        />
                      </div>
                    </div>
                    <img
                      src={item?.image}
                      alt="floor"
                      className="w-full h-[200px] object-cover"
                    />
                  </div>
                );
              })
            : "No Data Found!"}
        </div>
      </div>

      {confirmDeleteIndex !== null && (
        <Modal onClose={handleConfirmPopup} isOpen={true}>
          <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <p className="text-lg font-bold">
                Er du sikker på at du vil slette?
              </p>
              <div className="flex justify-center mt-5 w-full gap-5 items-center">
                <div
                  onClick={() => setConfirmDeleteIndex(null)}
                  className="w-1/2 sm:w-auto"
                >
                  <Button
                    text="Avbryt"
                    className="border border-gray2 text-black text-sm rounded-[8px] h-[40px] font-medium relative px-4 py-[10px] flex items-center gap-2"
                  />
                </div>
                <div onClick={() => handleDeleteFloor(confirmDeleteIndex)}>
                  <Button
                    text="Bekrefte"
                    className="border border-purple bg-purple text-white text-sm rounded-[8px] h-[40px] font-medium relative px-4 py-[10px] flex items-center gap-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {loading && <Spinner />}
    </>
  );
};
