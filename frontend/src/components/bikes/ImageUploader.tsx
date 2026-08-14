import { useState, type ChangeEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, X } from 'lucide-react'
import Spinner from '../ui/Spinner'
import { deleteBikeImage, uploadBikeImages } from '../../lib/bikes'
import { apiErrorMessage } from '../../lib/errors'
import { imageUrl } from '../../lib/format'
import type { Bike } from '../../types'

export default function ImageUploader({ bike }: { bike: Bike }) {
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const upload = useMutation({
    mutationFn: (files: File[]) => uploadBikeImages(bike.id, files),
    onSuccess: (updated) => qc.setQueryData(['bike', bike.id], updated),
    onError: (e) => setError(apiErrorMessage(e, 'Upload failed')),
  })

  const remove = useMutation({
    mutationFn: (imageId: number) => deleteBikeImage(bike.id, imageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bike', bike.id] }),
  })

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const files = Array.from(e.target.files ?? [])
    if (files.length) upload.mutate(files)
    e.target.value = ''
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {bike.images.map((img) => (
          <div
            key={img.id}
            className="group relative aspect-square overflow-hidden rounded-lg border border-line"
          >
            <img src={imageUrl(img.path)} alt="" className="h-full w-full object-cover" />
            {img.is_primary && (
              <span className="absolute left-1 top-1 rounded bg-ink/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
                Cover
              </span>
            )}
            <button
              type="button"
              onClick={() => remove.mutate(img.id)}
              className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-danger opacity-0 transition group-hover:opacity-100"
              aria-label="Remove photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line text-subtle transition hover:border-brand-300 hover:text-brand-600">
          {upload.isPending ? (
            <Spinner className="h-5 w-5" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />
              <span className="mt-1 text-xs">Add photos</span>
            </>
          )}
          <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <p className="mt-2 text-xs text-subtle">JPEG, PNG or WEBP. The first photo is the cover.</p>
    </div>
  )
}
