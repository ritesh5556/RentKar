import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Rent a bike from someone nearby
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
        List your bike and earn, or find the perfect ride by the day — scooters, motorcycles,
        e-bikes and more.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Link
          to="/bikes"
          className="rounded-md bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700"
        >
          Find a bike
        </Link>
        <Link
          to="/register"
          className="rounded-md border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-100"
        >
          List your bike
        </Link>
      </div>
    </div>
  )
}
