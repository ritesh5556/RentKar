import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Modal from '../ui/Modal'
import StarRating from '../ui/StarRating'
import Textarea from '../ui/Textarea'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import { createReview } from '../../lib/reviews'
import { apiErrorMessage } from '../../lib/errors'

export default function ReviewDialog({
  bookingId,
  targetLabel,
  onClose,
  onDone,
}: {
  bookingId: number
  targetLabel: string
  onClose: () => void
  onDone: () => void
}) {
  const qc = useQueryClient()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const mut = useMutation({
    mutationFn: () => createReview({ booking_id: bookingId, rating, comment: comment || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bike-reviews'] })
      onDone()
    },
  })

  return (
    <Modal title={`Review ${targetLabel}`} onClose={onClose}>
      <p className="mb-2 text-sm text-muted">How was it?</p>
      <StarRating value={rating} onChange={setRating} size={28} />
      <div className="mt-4">
        <Textarea
          label="Comment (optional)"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      {mut.isError && (
        <div className="mt-3">
          <Alert variant="error">{apiErrorMessage(mut.error)}</Alert>
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button loading={mut.isPending} onClick={() => mut.mutate()}>
          Submit review
        </Button>
      </div>
    </Modal>
  )
}
