import { UseFormRegister } from "react-hook-form";
import { CreateMarketFormValues } from "../../src/components/CreateMarket";

type TickerFormProps = {
  register: UseFormRegister<CreateMarketFormValues>;
};
export default function TickerForm({ register }: TickerFormProps) {
  return (
    <div className="space-y-2 my-4">
      <div className="grid grid-cols-1 md:grid-cols-2 justify-items-center items-center gap-3">
        <div className="indicator">
          <span className="indicator-item badge">Min Order Size</span>
          <input
            type="number"
            placeholder="100000"
            className="input input-bordered w-full md:w-[30vw]"
            {...register("lotSize", {
              required: true,
            })}
          />
        </div>
        <div className="indicator">
          <span className="indicator-item badge">Tick Size</span>
          <input
            type="number"
            placeholder="1000000"
            className="input input-bordered w-full md:w-[30vw]"
            {...register("tickSize", {
              required: true,
            })}
          />
        </div>
      </div>
    </div>
  );
}
